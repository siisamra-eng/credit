import db from "../db.server";

type GraphqlAdmin = {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
};

export type CreditDirection = "credit" | "debit";

type CreditAdjustmentInput = {
  admin: GraphqlAdmin;
  shop: string;
  customerId: string;
  /** Positive decimal amount, e.g. "12.50". No floating point values are accepted. */
  amount: string;
  currencyCode: string;
  direction: CreditDirection;
  reason: string;
  actor?: string;
  /** Stable key supplied by the authenticated route so resubmitting a request cannot double-issue. */
  idempotencyKey: string;
};

const CREDIT_MUTATION = `#graphql
  mutation StoreCreditCredit($id: ID!, $creditInput: StoreCreditAccountCreditInput!) {
    storeCreditAccountCredit(id: $id, creditInput: $creditInput) {
      storeCreditAccountTransaction {
        id
        amount { amount currencyCode }
        account { id }
        balanceAfterTransaction { amount currencyCode }
      }
      userErrors { field message }
    }
  }
`;

const DEBIT_MUTATION = `#graphql
  mutation StoreCreditDebit($id: ID!, $debitInput: StoreCreditAccountDebitInput!) {
    storeCreditAccountDebit(id: $id, debitInput: $debitInput) {
      storeCreditAccountTransaction {
        id
        amount { amount currencyCode }
        account { id }
        balanceAfterTransaction { amount currencyCode }
      }
      userErrors { field message }
    }
  }
`;

export function currencyExponent(currencyCode: string): number {
  if (!/^[A-Z]{3}$/.test(currencyCode))
    throw new Error("A three-letter ISO currency code is required.");
  try {
    return (
      new Intl.NumberFormat("en", {
        style: "currency",
        currency: currencyCode,
      }).resolvedOptions().maximumFractionDigits ?? 2
    );
  } catch {
    throw new Error(`Unsupported currency code: ${currencyCode}`);
  }
}

export function decimalToMinorUnits(amount: string, exponent: number): bigint {
  const match = /^(0|[1-9]\d*)(?:\.(\d+))?$/.exec(amount);
  if (!match) throw new Error("Amount must be a positive decimal string.");
  const fraction = match[2] ?? "";
  if (fraction.length > exponent && /[1-9]/.test(fraction.slice(exponent))) {
    throw new Error(`Amount has more than ${exponent} decimal places.`);
  }
  const normalizedFraction = fraction.slice(0, exponent).padEnd(exponent, "0");
  const scale = 10n ** BigInt(exponent);
  const minor = BigInt(match[1]) * scale + BigInt(normalizedFraction || "0");
  return minor;
}

export function minorUnitsToDecimal(
  amountMinor: bigint,
  exponent: number,
): string {
  const sign = amountMinor < 0n ? "-" : "";
  const absolute = amountMinor < 0n ? -amountMinor : amountMinor;
  const scale = 10n ** BigInt(exponent);
  const whole = absolute / scale;
  if (!exponent) return `${sign}${whole}`;
  return `${sign}${whole}.${(absolute % scale).toString().padStart(exponent, "0")}`;
}

function roundRatio(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new Error("Invalid amount denominator.");
  return (numerator + denominator / 2n) / denominator;
}

type MutationResult = {
  transactionGid: string;
  accountGid: string;
  balanceAfterMinor: bigint;
};

async function performStoreCreditMutation(input: {
  admin: GraphqlAdmin;
  customerId: string;
  amountMinor: bigint;
  currencyCode: string;
  currencyExponent: number;
  direction: CreditDirection;
}): Promise<MutationResult> {
  const isCredit = input.direction === "credit";
  const query = isCredit ? CREDIT_MUTATION : DEBIT_MUTATION;
  const variables = isCredit
    ? {
        id: input.customerId,
        creditInput: {
          creditAmount: {
            amount: minorUnitsToDecimal(
              input.amountMinor,
              input.currencyExponent,
            ),
            currencyCode: input.currencyCode,
          },
        },
      }
    : {
        id: input.customerId,
        debitInput: {
          debitAmount: {
            amount: minorUnitsToDecimal(
              input.amountMinor,
              input.currencyExponent,
            ),
            currencyCode: input.currencyCode,
          },
        },
      };
  const response = await input.admin.graphql(query, { variables });
  const body = (await response.json()) as {
    errors?: Array<{ message: string }>;
    data?: Record<
      string,
      {
        storeCreditAccountTransaction?: {
          id: string;
          account: { id: string };
          balanceAfterTransaction: { amount: string; currencyCode: string };
        } | null;
        userErrors?: Array<{ message: string; field?: string[] }>;
      }
    >;
  };
  if (!response.ok || body.errors?.length) {
    throw new Error(
      body.errors?.map((error) => error.message).join("; ") ||
        `Shopify Admin API returned ${response.status}.`,
    );
  }
  const result =
    body.data?.[
      isCredit ? "storeCreditAccountCredit" : "storeCreditAccountDebit"
    ];
  if (result?.userErrors?.length)
    throw new Error(result.userErrors.map((error) => error.message).join("; "));
  const transaction = result?.storeCreditAccountTransaction;
  if (!transaction)
    throw new Error("Shopify did not return a store credit transaction.");
  return {
    transactionGid: transaction.id,
    accountGid: transaction.account.id,
    balanceAfterMinor: decimalToMinorUnits(
      transaction.balanceAfterTransaction.amount,
      input.currencyExponent,
    ),
  };
}

/** Issue or debit native Shopify store credit and record its local audit entry. */
export async function adjustCustomerStoreCredit(input: CreditAdjustmentInput) {
  const reason = input.reason.trim();
  if (!reason)
    throw new Error("A reason is required for every store credit adjustment.");
  if (!input.shop.endsWith(".myshopify.com"))
    throw new Error("A Shopify shop domain is required.");
  if (!/^gid:\/\/shopify\/Customer\/\d+$/.test(input.customerId))
    throw new Error("A valid Shopify Customer GID is required.");

  const exponent = currencyExponent(input.currencyCode);
  const amountMinor = decimalToMinorUnits(input.amount, exponent);
  if (amountMinor <= 0n) throw new Error("Amount must be greater than zero.");
  const idempotencyKey = input.idempotencyKey.trim();
  if (!idempotencyKey || idempotencyKey.length > 200)
    throw new Error("A valid idempotency key is required.");
  const customerResponse = await input.admin.graphql(
    `#graphql
    query StoreCreditCustomer($id: ID!) { customer(id: $id) { id } }
  `,
    { variables: { id: input.customerId } },
  );
  const customerBody = (await customerResponse.json()) as {
    errors?: Array<{ message: string }>;
    data?: { customer?: { id: string } | null };
  };
  if (
    !customerResponse.ok ||
    customerBody.errors?.length ||
    !customerBody.data?.customer
  ) {
    throw new Error("Customer was not found in this Shopify store.");
  }
  const existing = await db.creditLedgerEntry.findUnique({
    where: { shop_idempotencyKey: { shop: input.shop, idempotencyKey } },
  });
  if (existing?.status === "SUCCEEDED") return existing;
  if (existing)
    throw new Error(
      "This adjustment is already in progress or needs reconciliation.",
    );

  const entry = await db.creditLedgerEntry.create({
    data: {
      shop: input.shop,
      customerGid: input.customerId,
      kind: input.direction === "credit" ? "MANUAL_CREDIT" : "MANUAL_DEBIT",
      amountMinor,
      currencyCode: input.currencyCode,
      currencyExponent: exponent,
      reason,
      actor: input.actor?.trim() || null,
      idempotencyKey,
    },
  });

  try {
    const transaction = await performStoreCreditMutation({
      ...input,
      currencyExponent: exponent,
      amountMinor,
    });
    return await db.creditLedgerEntry.update({
      where: { id: entry.id },
      data: {
        status: "SUCCEEDED",
        transactionGid: transaction.transactionGid,
        accountGid: transaction.accountGid,
        balanceAfterMinor: transaction.balanceAfterMinor,
      },
    });
  } catch (error) {
    await db.creditLedgerEntry.update({
      where: { id: entry.id },
      data: { status: "REVIEW_REQUIRED" },
    });
    throw error;
  }
}

export async function awardPaidOrderCashback(input: {
  admin: GraphqlAdmin;
  shop: string;
  orderGid: string;
  customerGid: string;
  currencyCode: string;
  merchandiseBasisMinor: bigint;
  lineItems: Array<{ id: string; basisMinor: string; eligible: boolean }>;
  basisPoints: number;
  ruleName: string;
}) {
  if (input.merchandiseBasisMinor <= 0n || input.basisPoints <= 0) return null;
  const exponent = currencyExponent(input.currencyCode);
  const amountMinor = roundRatio(
    input.merchandiseBasisMinor * BigInt(input.basisPoints),
    10_000n,
  );
  if (amountMinor <= 0n) return null;
  const idempotencyKey = `cashback:${input.orderGid}`;
  const prior = await db.cashbackOrder.findUnique({
    where: { shop_orderGid: { shop: input.shop, orderGid: input.orderGid } },
  });
  if (prior) return prior;

  const order = await db.cashbackOrder.create({
    data: {
      shop: input.shop,
      orderGid: input.orderGid,
      customerGid: input.customerGid,
      currencyCode: input.currencyCode,
      currencyExponent: exponent,
      merchandiseBasisMinor: input.merchandiseBasisMinor,
      cashbackMinor: amountMinor,
      lineItemsJson: JSON.stringify(input.lineItems),
    },
  });
  const ledger = await db.creditLedgerEntry.create({
    data: {
      shop: input.shop,
      customerGid: input.customerGid,
      orderGid: input.orderGid,
      kind: "CASHBACK_AWARD",
      amountMinor,
      currencyCode: input.currencyCode,
      currencyExponent: exponent,
      reason: `${input.ruleName} (${input.basisPoints / 100}% cashback)`,
      idempotencyKey,
    },
  });
  try {
    const transaction = await performStoreCreditMutation({
      admin: input.admin,
      customerId: input.customerGid,
      amountMinor,
      currencyCode: input.currencyCode,
      currencyExponent: exponent,
      direction: "credit",
    });
    await db.$transaction([
      db.creditLedgerEntry.update({
        where: { id: ledger.id },
        data: {
          status: "SUCCEEDED",
          transactionGid: transaction.transactionGid,
          accountGid: transaction.accountGid,
          balanceAfterMinor: transaction.balanceAfterMinor,
        },
      }),
      db.cashbackOrder.update({
        where: { id: order.id },
        data: {
          status: "CREDITED",
          shopifyTransactionGid: transaction.transactionGid,
        },
      }),
    ]);
    return {
      ...order,
      status: "CREDITED",
      shopifyTransactionGid: transaction.transactionGid,
    };
  } catch (error) {
    await db.$transaction([
      db.creditLedgerEntry.update({
        where: { id: ledger.id },
        data: { status: "REVIEW_REQUIRED" },
      }),
      db.cashbackOrder.update({
        where: { id: order.id },
        data: { status: "REVIEW_REQUIRED" },
      }),
    ]);
    throw error;
  }
}

export async function reverseRefundCashback(input: {
  admin: GraphqlAdmin;
  shop: string;
  orderGid: string;
  refundGid: string;
  refundedLines: Array<{ lineItemGid: string; subtotalMinor: bigint }>;
}) {
  const idempotencyKey = `refund:${input.refundGid}`;
  const priorLedger = await db.creditLedgerEntry.findUnique({
    where: { shop_idempotencyKey: { shop: input.shop, idempotencyKey } },
  });
  if (priorLedger) return priorLedger;
  let order = await db.cashbackOrder.findUnique({
    where: { shop_orderGid: { shop: input.shop, orderGid: input.orderGid } },
  });
  if (!order || order.status !== "CREDITED") return null;
  const lock = await db.cashbackOrder.updateMany({
    where: { id: order.id, processingRefundKey: null },
    data: { processingRefundKey: idempotencyKey },
  });
  if (lock.count !== 1)
    throw new Error(
      "Another refund reversal is in progress or needs reconciliation.",
    );
  order = await db.cashbackOrder.findUniqueOrThrow({ where: { id: order.id } });

  const lineItems = JSON.parse(order.lineItemsJson) as Array<{
    id: string;
    basisMinor: string;
    eligible: boolean;
  }>;
  const eligibleLines = new Map(
    lineItems
      .filter((line) => line.eligible)
      .map((line) => [line.id, BigInt(line.basisMinor)]),
  );
  const refundedByLine = JSON.parse(order.refundedLinesJson) as Record<
    string,
    string
  >;
  const nextRefundedByLine = { ...refundedByLine };
  const refundBasisMinor = input.refundedLines.reduce((sum, line) => {
    const basis = eligibleLines.get(line.lineItemGid);
    if (!basis || basis <= 0n) return sum;
    const alreadyRefunded = BigInt(refundedByLine[line.lineItemGid] ?? "0");
    const remaining = basis > alreadyRefunded ? basis - alreadyRefunded : 0n;
    const accepted =
      line.subtotalMinor > remaining ? remaining : line.subtotalMinor;
    nextRefundedByLine[line.lineItemGid] = (
      alreadyRefunded + accepted
    ).toString();
    return sum + accepted;
  }, 0n);
  if (refundBasisMinor <= 0n) {
    await db.cashbackOrder.update({
      where: { id: order.id },
      data: { processingRefundKey: null },
    });
    return null;
  }

  const cumulativeBasis = order.refundedBasisMinor + refundBasisMinor;
  const cappedBasis =
    cumulativeBasis > order.merchandiseBasisMinor
      ? order.merchandiseBasisMinor
      : cumulativeBasis;
  const cumulativeReversal = roundRatio(
    order.cashbackMinor * cappedBasis,
    order.merchandiseBasisMinor,
  );
  const amountMinor =
    cumulativeReversal > order.reversedMinor
      ? cumulativeReversal - order.reversedMinor
      : 0n;
  if (amountMinor <= 0n) {
    await db.cashbackOrder.update({
      where: { id: order.id },
      data: {
        refundedBasisMinor: cappedBasis,
        refundedLinesJson: JSON.stringify(nextRefundedByLine),
        processingRefundKey: null,
      },
    });
    return null;
  }

  const ledger = await db.creditLedgerEntry.create({
    data: {
      shop: input.shop,
      customerGid: order.customerGid,
      orderGid: input.orderGid,
      refundGid: input.refundGid,
      kind: "CASHBACK_REFUND_REVERSAL",
      amountMinor,
      currencyCode: order.currencyCode,
      currencyExponent: order.currencyExponent,
      reason: `Cashback reversal for refund ${input.refundGid}`,
      idempotencyKey,
    },
  });
  try {
    const transaction = await performStoreCreditMutation({
      admin: input.admin,
      customerId: order.customerGid,
      amountMinor,
      currencyCode: order.currencyCode,
      currencyExponent: order.currencyExponent,
      direction: "debit",
    });
    await db.$transaction([
      db.creditLedgerEntry.update({
        where: { id: ledger.id },
        data: {
          status: "SUCCEEDED",
          transactionGid: transaction.transactionGid,
          accountGid: transaction.accountGid,
          balanceAfterMinor: transaction.balanceAfterMinor,
        },
      }),
      db.cashbackOrder.update({
        where: { id: order.id },
        data: {
          refundedBasisMinor: cappedBasis,
          reversedMinor: order.reversedMinor + amountMinor,
          refundedLinesJson: JSON.stringify(nextRefundedByLine),
          processingRefundKey: null,
        },
      }),
    ]);
    return ledger;
  } catch (error) {
    await db.creditLedgerEntry.update({
      where: { id: ledger.id },
      data: { status: "REVIEW_REQUIRED" },
    });
    throw error;
  }
}

export function moneyRatioMinor(
  numeratorMinor: bigint,
  numerator: bigint,
  denominator: bigint,
): bigint {
  return denominator > 0n
    ? roundRatio(numeratorMinor * numerator, denominator)
    : 0n;
}
