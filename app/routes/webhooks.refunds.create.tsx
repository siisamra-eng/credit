import type { ActionFunctionArgs } from "react-router";
import db from "../db.server";
import {
  currencyExponent,
  decimalToMinorUnits,
  reverseRefundCashback,
} from "../services/store-credit.server";
import { authenticate } from "../shopify.server";

const REFUND_QUERY = `#graphql
  query RefundCashbackBasis($id: ID!) {
    shop { currencyCode }
    refund(id: $id) {
      id
      order { id }
      refundLineItems(first: 250) {
        nodes {
          quantity
          subtotalSet { shopMoney { amount currencyCode } }
          lineItem { id }
        }
        pageInfo { hasNextPage }
      }
    }
  }
`;

type RefundWebhookPayload = {
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
      payload: RefundWebhookPayload;
      shop: string;
      topic: string;
      webhookId?: string;
    };
  if (!admin)
    return new Response("Shopify admin context is unavailable for this shop.", {
      status: 503,
    });
  const refundGid = payload.admin_graphql_api_id;
  const receiptId =
    webhookId || (refundGid ? `refunds/create:${refundGid}` : undefined);
  if (!refundGid || !receiptId)
    return new Response("Webhook payload is missing a refund ID.", {
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
    const response = await admin.graphql(REFUND_QUERY, {
      variables: { id: refundGid },
    });
    const body = (await response.json()) as {
      errors?: Array<{ message: string }>;
      data?: {
        shop: { currencyCode: string };
        refund?: {
          id: string;
          order: { id: string };
          refundLineItems: {
            nodes: Array<{
              subtotalSet: {
                shopMoney: { amount: string; currencyCode: string };
              };
              lineItem: { id: string } | null;
            }>;
            pageInfo: { hasNextPage: boolean };
          };
        } | null;
      };
    };
    if (!response.ok || body.errors?.length || !body.data?.refund)
      throw new Error(
        body.errors?.map((error) => error.message).join("; ") ||
          "Shopify could not return the refund.",
      );
    const refund = body.data.refund;
    if (refund.refundLineItems.pageInfo.hasNextPage)
      throw new Error(
        "Refund has more than 250 line items; cashback requires reconciliation.",
      );
    const exponent = currencyExponent(body.data.shop.currencyCode);
    const refundedLines = refund.refundLineItems.nodes.flatMap((line) =>
      line.lineItem
        ? [
            {
              lineItemGid: line.lineItem.id,
              subtotalMinor: decimalToMinorUnits(
                line.subtotalSet.shopMoney.amount,
                exponent,
              ),
            },
          ]
        : [],
    );
    await reverseRefundCashback({
      admin,
      shop,
      orderGid: refund.order.id,
      refundGid: refund.id,
      refundedLines,
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
            : "Unknown refund reversal failure",
      },
    });
    return new Response("Refund cashback reversal requires reconciliation.", {
      status: 500,
    });
  }
};
