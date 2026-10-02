import { useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";
import { adjustCustomerStoreCredit } from "../services/store-credit.server";
import { authenticate } from "../shopify.server";

const ownerOnly = (
  session: Awaited<ReturnType<typeof authenticate.admin>>["session"],
) => {
  const actor = session.onlineAccessInfo?.associated_user;
  if (!actor?.account_owner)
    throw new Response(
      "Only the Shopify account owner can approve credit changes.",
      { status: 403 },
    );
  return `${actor.first_name} ${actor.last_name} <${actor.email}>`;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const [rule, entries] = await Promise.all([
    db.cashbackRule.findUnique({
      where: { shop_name: { shop: session.shop, name: "Order cashback" } },
    }),
    db.creditLedgerEntry.findMany({
      where: { shop: session.shop },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);
  return {
    shop: session.shop,
    isOwner: session.onlineAccessInfo?.associated_user?.account_owner === true,
    ownerEmail: session.onlineAccessInfo?.associated_user?.email ?? null,
    idempotencyKey: crypto.randomUUID(),
    rule: rule
      ? { ...rule, cashbackBasisPoints: rule.cashbackBasisPoints }
      : null,
    entries: entries.map((entry) => ({
      id: entry.id,
      customerGid: entry.customerGid,
      kind: entry.kind,
      status: entry.status,
      amount: minorUnitsToAmount(entry.amountMinor, entry.currencyExponent),
      currencyCode: entry.currencyCode,
      reason: entry.reason,
      createdAt: entry.createdAt.toISOString(),
    })),
  };
};

function minorUnitsToAmount(amountMinor: bigint, exponent: number) {
  const scale = 10n ** BigInt(exponent);
  const whole = amountMinor / scale;
  if (!exponent) return whole.toString();
  return `${whole}.${(amountMinor % scale).toString().padStart(exponent, "0")}`;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const actor = ownerOnly(session);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "save_rule");

  if (intent === "save_rule" || intent === "activate_rule") {
    const activate = intent === "activate_rule";
    const rate = String(form.get("rate") ?? "").trim();
    const percentage = Number(rate);
    if (
      !Number.isFinite(percentage) ||
      percentage < 0.01 ||
      percentage > 100 ||
      !/^\d{1,3}(?:\.\d{1,2})?$/.test(rate)
    ) {
      return {
        ok: false,
        message:
          "Enter a cashback rate from 0.01% to 100%, with up to two decimals.",
      };
    }
    if (activate && form.get("confirmActivation") !== "yes") {
      return {
        ok: false,
        message:
          "Confirm that you approve automatic cashback before activating this rule.",
      };
    }
    const tag = String(form.get("eligibleCustomerTag") ?? "").trim();
    if (tag.length > 255)
      return {
        ok: false,
        message: "Customer tag must be 255 characters or fewer.",
      };
    await db.cashbackRule.upsert({
      where: { shop_name: { shop: session.shop, name: "Order cashback" } },
      create: {
        shop: session.shop,
        name: "Order cashback",
        active: activate,
        cashbackBasisPoints: Math.round(percentage * 100),
        eligibleCustomerTag: tag || null,
        approvedBy: activate ? actor : null,
        approvedAt: activate ? new Date() : null,
      },
      update: {
        active: activate,
        cashbackBasisPoints: Math.round(percentage * 100),
        eligibleCustomerTag: tag || null,
        ...(activate ? { approvedBy: actor, approvedAt: new Date() } : {}),
      },
    });
    return {
      ok: true,
      message: activate
        ? "Cashback rule approved and activated for future eligible paid orders."
        : "Cashback rule saved in paused mode.",
    };
  }

  if (intent === "adjust_credit") {
    if (form.get("approveAdjustment") !== "yes")
      return {
        ok: false,
        message:
          "Confirm the customer and amount before issuing the adjustment.",
      };
    const direction = String(form.get("direction") ?? "credit");
    if (direction !== "credit" && direction !== "debit")
      return { ok: false, message: "Choose credit or debit." };
    const rawCustomerId = String(form.get("customerId") ?? "").trim();
    const customerId = /^\d+$/.test(rawCustomerId)
      ? `gid://shopify/Customer/${rawCustomerId}`
      : rawCustomerId;
    const amount = String(form.get("amount") ?? "").trim();
    const currencyCode = String(form.get("currencyCode") ?? "")
      .trim()
      .toUpperCase();
    const reason = String(form.get("reason") ?? "").trim();
    const idempotencyKey = String(form.get("idempotencyKey") ?? "").trim();
    try {
      const result = await adjustCustomerStoreCredit({
        admin,
        shop: session.shop,
        customerId,
        amount,
        currencyCode,
        direction,
        reason,
        actor,
        idempotencyKey,
      });
      return {
        ok: true,
        message: `${direction === "credit" ? "Credit" : "Debit"} recorded: ${amount} ${currencyCode}. Shopify transaction ${result.transactionGid}.`,
      };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error ? error.message : "Credit adjustment failed.",
      };
    }
  }

  return { ok: false, message: "Unknown action." };
};

const amountFormatter = (amount: string, currencyCode: string) => {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currencyCode,
    }).format(Number(amount));
  } catch {
    return `${amount} ${currencyCode}`;
  }
};

export default function Index() {
  const { shop, isOwner, ownerEmail, idempotencyKey, rule, entries } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [activationApproved, setActivationApproved] = useState(false);
  const [adjustmentApproved, setAdjustmentApproved] = useState(false);
  return (
    <s-page heading="Carbinox Credit">
      <s-section heading="Store overview">
        <s-paragraph>
          Connected to <strong>{shop}</strong>. Store-credit transactions are
          native Shopify credits.
        </s-paragraph>
        {isOwner ? (
          <s-banner tone="info">
            Owner approval is required to activate cashback and submit manual
            credit adjustments. Approval is logged with the transaction.
          </s-banner>
        ) : (
          <s-banner tone="warning">
            This account is read-only for credit changes. Ask the Shopify
            account owner to approve rewards or adjustments.
          </s-banner>
        )}
        {actionData && (
          <s-banner tone={actionData.ok ? "success" : "critical"}>
            {actionData.message}
          </s-banner>
        )}
      </s-section>

      <s-section heading="Cashback rule">
        <s-paragraph>
          Cashback is calculated from eligible merchandise after discounts,
          excluding tax, shipping, and gift cards.
        </s-paragraph>
        {rule && (
          <s-banner tone={rule.active ? "success" : "warning"}>
            {rule.active ? "Active" : "Paused"} ·{" "}
            {rule.cashbackBasisPoints / 100}% back
            {rule.eligibleCustomerTag
              ? ` · Customer tag: ${rule.eligibleCustomerTag}`
              : " · All customers"}
          </s-banner>
        )}
        {rule?.approvedBy && rule.approvedAt && (
          <s-paragraph>
            Last activated by {rule.approvedBy} on{" "}
            {new Date(rule.approvedAt).toLocaleString()}.
          </s-paragraph>
        )}
        {!isOwner ? (
          <s-paragraph>
            Only the Shopify account owner can save or activate the rule.
          </s-paragraph>
        ) : (
          <Form
            method="post"
            style={{ marginTop: 14 }}
            onSubmit={(event) => {
              const submitter = (event.nativeEvent as SubmitEvent)
                .submitter as HTMLButtonElement | null;
              if (
                submitter?.value === "activate_rule" &&
                !window.confirm(
                  "Activate automatic cashback for future matching paid orders? This will issue real Shopify store credit.",
                )
              ) {
                event.preventDefault();
                return;
              }
              setActivationApproved(false);
            }}
          >
            <s-stack direction="inline" gap="base" alignItems="end">
              <s-number-field
                label="Cashback rate (%)"
                name="rate"
                min={0.01}
                max={100}
                step={0.01}
                value={rule ? String(rule.cashbackBasisPoints / 100) : "10"}
                required
              />
              <s-text-field
                label="Eligible customer tag (optional)"
                name="eligibleCustomerTag"
                value={rule?.eligibleCustomerTag ?? ""}
              />
            </s-stack>
            <label
              style={{
                display: "flex",
                gap: 9,
                alignItems: "flex-start",
                fontSize: 13,
                maxWidth: 760,
                margin: "16px 0 12px",
              }}
            >
              <input
                type="checkbox"
                name="confirmActivation"
                value="yes"
                checked={activationApproved}
                onChange={(event) =>
                  setActivationApproved(event.currentTarget.checked)
                }
              />
              <span>
                I approve automatic cashback at this rate for future matching
                paid orders. This creates real Shopify store credit after the
                order is paid.
              </span>
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="submit"
                name="intent"
                value="save_rule"
                style={{
                  border: "1px solid #c9cbc5",
                  borderRadius: 5,
                  padding: "8px 13px",
                  background: "#fff",
                  cursor: "pointer",
                  font: "600 12px inherit",
                }}
              >
                Save and pause rule
              </button>
              <button
                type="submit"
                name="intent"
                value="activate_rule"
                disabled={!activationApproved}
                style={{
                  border: "1px solid #fec200",
                  borderRadius: 5,
                  padding: "8px 13px",
                  background: activationApproved ? "#fec200" : "#f0f0ec",
                  color: "#111",
                  cursor: activationApproved ? "pointer" : "not-allowed",
                  font: "600 12px inherit",
                }}
              >
                Approve and activate cashback
              </button>
            </div>
          </Form>
        )}
      </s-section>

      <s-section heading="Manual credit or debit">
        <s-paragraph>
          Use a Shopify customer ID, a reason, and the store currency. Confirmed
          adjustments change the customer’s real Shopify store-credit balance.
        </s-paragraph>
        {!isOwner ? (
          <s-paragraph>
            Manual adjustments are available to the Shopify account owner only.
          </s-paragraph>
        ) : (
          <Form
            method="post"
            onSubmit={(event) => {
              if (!adjustmentApproved) {
                event.preventDefault();
                return;
              }
              const values = new FormData(event.currentTarget);
              const direction = String(values.get("direction"));
              const amount = String(values.get("amount"));
              const currency = String(values.get("currencyCode")).toUpperCase();
              const customer = String(values.get("customerId"));
              const reason = String(values.get("reason"));
              if (
                !window.confirm(
                  `Confirm ${direction} of ${amount} ${currency} for Shopify customer ${customer}?\n\nReason: ${reason}\n\nThis changes the customer’s real Shopify store-credit balance.`,
                )
              ) {
                event.preventDefault();
                return;
              }
              setAdjustmentApproved(false);
            }}
          >
            <input type="hidden" name="intent" value="adjust_credit" />
            <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
            <s-stack direction="inline" gap="base" alignItems="end">
              <s-select label="Action" name="direction" value="credit">
                <s-option value="credit">Add credit</s-option>
                <s-option value="debit">Debit credit</s-option>
              </s-select>
              <s-text-field
                label="Customer ID"
                name="customerId"
                placeholder="e.g. 1234567890"
                required
              />
              <s-number-field
                label="Amount"
                name="amount"
                min={0.01}
                step={0.01}
                required
              />
              <s-text-field
                label="Currency code"
                name="currencyCode"
                placeholder="EUR"
                required
              />
              <s-text-field
                label="Reason"
                name="reason"
                placeholder="Loyalty thank-you"
                required
              />
            </s-stack>
            <label
              style={{
                display: "flex",
                gap: 9,
                alignItems: "flex-start",
                fontSize: 13,
                margin: "16px 0",
              }}
            >
              <input
                type="checkbox"
                name="approveAdjustment"
                value="yes"
                checked={adjustmentApproved}
                onChange={(event) =>
                  setAdjustmentApproved(event.currentTarget.checked)
                }
              />
              <span>
                I approve this adjustment for the Shopify customer ID and amount
                entered above, after checking the customer record.
              </span>
            </label>
            <s-button
              type="submit"
              variant="primary"
              disabled={!adjustmentApproved}
            >
              Review and issue adjustment
            </s-button>
            {ownerEmail && (
              <s-paragraph>
                Approval will be attributed to {ownerEmail}.
              </s-paragraph>
            )}
          </Form>
        )}
      </s-section>

      <s-section heading="Recent app ledger entries">
        {entries.length === 0 ? (
          <s-paragraph>
            No credit transactions have been recorded by this app yet.
          </s-paragraph>
        ) : (
          entries.map((entry) => (
            <s-box
              key={entry.id}
              padding="base"
              borderWidth="base"
              borderRadius="base"
              background="subdued"
            >
              <s-stack direction="inline" gap="base" alignItems="center">
                <strong>{entry.kind.replaceAll("_", " ")}</strong>
                <span>{amountFormatter(entry.amount, entry.currencyCode)}</span>
                <span>{entry.status}</span>
                <span>{entry.customerGid.split("/").at(-1)}</span>
                <span>{entry.reason}</span>
                <span>{new Date(entry.createdAt).toLocaleString()}</span>
              </s-stack>
            </s-box>
          ))
        )}
      </s-section>
      <s-section slot="aside" heading="Presentation preview">
        <s-paragraph>
          The public preview uses sample data and does not change Shopify
          balances.
        </s-paragraph>
        <s-button href="/" target="_blank" variant="secondary">
          Open preview
        </s-button>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) =>
  boundary.headers(headersArgs);
