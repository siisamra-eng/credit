import type { ActionFunctionArgs } from "react-router";
import db from "../db.server";
import {
  awardPaidOrderCashback,
  currencyExponent,
  decimalToMinorUnits,
} from "../services/store-credit.server";
import { authenticate } from "../shopify.server";

const PAID_ORDER_QUERY = `#graphql
  query PaidOrderCashback($id: ID!) {
    shop { currencyCode }
    order(id: $id) {
      id
      customer { id }
      lineItems(first: 250) {
        nodes {
          id
          isGiftCard
          priceAfterAllDiscountsBeforeTaxesSet { shopMoney { amount currencyCode } }
        }
        pageInfo { hasNextPage }
      }
    }
  }
`;

const CUSTOMER_TAGS_QUERY = `#graphql
  query CashbackCustomerTags($id: ID!) {
    customer(id: $id) { id tags }
  }
`;

type PaidWebhookPayload = {
  admin_graphql_api_id?: string;
  id?: number | string;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, payload, shop, topic, webhookId } =
    (await authenticate.webhook(request)) as {
      admin?: {
        graphql: (
          query: string,
          options?: { variables?: Record<string, unknown> },
        ) => Promise<Response>;
      };
      payload: PaidWebhookPayload;
      shop: string;
      topic: string;
      webhookId?: string;
    };
  if (!admin)
    return new Response("Shopify admin context is unavailable for this shop.", {
      status: 503,
    });
  const orderGid = payload.admin_graphql_api_id;
  const receiptId =
    webhookId || (orderGid ? `orders/paid:${orderGid}` : undefined);
  if (!orderGid || !receiptId)
    return new Response("Webhook payload is missing an order ID.", {
      status: 400,
    });

  try {
    await db.webhookReceipt.create({
      data: { shop, webhookId: receiptId, topic, status: "PROCESSING" },
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002")
      return new Response(null, { status: 200 });
    throw error;
  }

  try {
    const rule = await db.cashbackRule.findUnique({
      where: { shop_name: { shop, name: "Order cashback" } },
    });
    if (!rule?.active) {
      await db.webhookReceipt.update({
        where: { shop_webhookId: { shop, webhookId: receiptId } },
        data: { status: "SKIPPED", completedAt: new Date() },
      });
      return new Response(null, { status: 200 });
    }

    const orderResponse = await admin.graphql(PAID_ORDER_QUERY, {
      variables: { id: orderGid },
    });
    const orderBody = (await orderResponse.json()) as {
      errors?: Array<{ message: string }>;
      data?: {
        shop: { currencyCode: string };
        order?: {
          id: string;
          customer: { id: string } | null;
          lineItems: {
            nodes: Array<{
              id: string;
              isGiftCard: boolean;
              priceAfterAllDiscountsBeforeTaxesSet: {
                shopMoney: { amount: string; currencyCode: string };
              };
            }>;
            pageInfo: { hasNextPage: boolean };
          };
        } | null;
      };
    };
    if (!orderResponse.ok || orderBody.errors?.length || !orderBody.data?.order)
      throw new Error(
        orderBody.errors?.map((error) => error.message).join("; ") ||
          "Shopify could not return the paid order.",
      );
    const order = orderBody.data.order;
    if (!order.customer) {
      await db.webhookReceipt.update({
        where: { shop_webhookId: { shop, webhookId: receiptId } },
        data: { status: "SKIPPED", completedAt: new Date() },
      });
      return new Response(null, { status: 200 });
    }
    if (order.lineItems.pageInfo.hasNextPage)
      throw new Error(
        "Order has more than 250 line items; cashback requires reconciliation.",
      );

    if (rule.eligibleCustomerTag) {
      const tagResponse = await admin.graphql(CUSTOMER_TAGS_QUERY, {
        variables: { id: order.customer.id },
      });
      const tagBody = (await tagResponse.json()) as {
        errors?: Array<{ message: string }>;
        data?: { customer?: { tags: string[] } | null };
      };
      if (!tagResponse.ok || tagBody.errors?.length || !tagBody.data?.customer)
        throw new Error(
          tagBody.errors?.map((error) => error.message).join("; ") ||
            "Shopify could not return customer tags.",
        );
      if (!tagBody.data.customer.tags.includes(rule.eligibleCustomerTag)) {
        await db.webhookReceipt.update({
          where: { shop_webhookId: { shop, webhookId: receiptId } },
          data: { status: "SKIPPED", completedAt: new Date() },
        });
        return new Response(null, { status: 200 });
      }
    }

    const currencyCode = orderBody.data.shop.currencyCode;
    const exponent = currencyExponent(currencyCode);
    const lineItems = order.lineItems.nodes.map((line) => ({
      id: line.id,
      eligible: !line.isGiftCard,
      basisMinor: line.isGiftCard
        ? "0"
        : decimalToMinorUnits(
            line.priceAfterAllDiscountsBeforeTaxesSet.shopMoney.amount,
            exponent,
          ).toString(),
    }));
    const merchandiseBasisMinor = lineItems.reduce(
      (total, line) => total + BigInt(line.basisMinor),
      0n,
    );
    await awardPaidOrderCashback({
      admin,
      shop,
      orderGid: order.id,
      customerGid: order.customer.id,
      currencyCode,
      merchandiseBasisMinor,
      lineItems,
      basisPoints: rule.cashbackBasisPoints,
      ruleName: rule.name,
    });
    await db.webhookReceipt.update({
      where: { shop_webhookId: { shop, webhookId: receiptId } },
      data: { status: "SUCCEEDED", completedAt: new Date() },
    });
    return new Response(null, { status: 200 });
  } catch (error) {
    await db.webhookReceipt.update({
      where: { shop_webhookId: { shop, webhookId: receiptId } },
      data: {
        status: "REVIEW_REQUIRED",
        error:
          error instanceof Error
            ? error.message
            : "Unknown cashback processing failure",
      },
    });
    return new Response("Cashback webhook requires reconciliation.", {
      status: 500,
    });
  }
};
