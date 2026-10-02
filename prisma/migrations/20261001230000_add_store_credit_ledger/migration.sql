CREATE TABLE "CashbackRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Order cashback',
    "active" BOOLEAN NOT NULL DEFAULT false,
    "cashbackBasisPoints" INTEGER NOT NULL DEFAULT 1000,
    "eligibleCustomerTag" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "CashbackRule_shop_name_key" ON "CashbackRule"("shop", "name");
CREATE INDEX "CashbackRule_shop_active_idx" ON "CashbackRule"("shop", "active");

CREATE TABLE "CashbackOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "orderGid" TEXT NOT NULL,
    "customerGid" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "currencyExponent" INTEGER NOT NULL,
    "merchandiseBasisMinor" BIGINT NOT NULL,
    "cashbackMinor" BIGINT NOT NULL,
    "refundedBasisMinor" BIGINT NOT NULL DEFAULT 0,
    "reversedMinor" BIGINT NOT NULL DEFAULT 0,
    "lineItemsJson" TEXT NOT NULL,
    "refundedLinesJson" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "shopifyTransactionGid" TEXT,
    "processingRefundKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "CashbackOrder_shop_orderGid_key" ON "CashbackOrder"("shop", "orderGid");
CREATE INDEX "CashbackOrder_shop_customerGid_idx" ON "CashbackOrder"("shop", "customerGid");

CREATE TABLE "CreditLedgerEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "customerGid" TEXT NOT NULL,
    "accountGid" TEXT,
    "transactionGid" TEXT,
    "orderGid" TEXT,
    "refundGid" TEXT,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "amountMinor" BIGINT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "currencyExponent" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "actor" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "balanceAfterMinor" BIGINT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "CreditLedgerEntry_shop_idempotencyKey_key" ON "CreditLedgerEntry"("shop", "idempotencyKey");
CREATE INDEX "CreditLedgerEntry_shop_customerGid_createdAt_idx" ON "CreditLedgerEntry"("shop", "customerGid", "createdAt");
CREATE INDEX "CreditLedgerEntry_shop_orderGid_idx" ON "CreditLedgerEntry"("shop", "orderGid");

CREATE TABLE "WebhookReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME
);
CREATE UNIQUE INDEX "WebhookReceipt_shop_webhookId_key" ON "WebhookReceipt"("shop", "webhookId");
CREATE INDEX "WebhookReceipt_shop_topic_createdAt_idx" ON "WebhookReceipt"("shop", "topic", "createdAt");
