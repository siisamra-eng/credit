import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function Safeguards() {
  return (
    <s-page heading="Credit safeguards">
      <s-section heading="Before cashback can run">
        <s-paragraph>
          An earning rule must be deliberately created and enabled for
          paid-order cashback to issue store credit. New rules default to
          paused. Until a rule is enabled, paid orders are recorded as skipped
          and no credit is added.
        </s-paragraph>
      </s-section>
      <s-section heading="Manual adjustments">
        <s-paragraph>
          Manual credit and debit are restricted to the Shopify account owner.
          The owner must check an approval box and confirm the exact customer,
          amount, currency, and reason before Shopify is called. Each successful
          adjustment is recorded with its actor, reason, Shopify transaction ID,
          and resulting balance.
        </s-paragraph>
      </s-section>
      <s-section heading="Refunds and reconciliation">
        <s-paragraph>
          Refund webhooks reverse the cashback attributable to eligible refunded
          merchandise. If Shopify accepts a transaction but the local ledger
          cannot confirm it, the entry is marked for review instead of being
          retried as a new credit.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) =>
  boundary.headers(headersArgs);
