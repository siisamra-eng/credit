import { useState } from "react";
import type { MetaFunction } from "react-router";
import styles from "./styles.module.css";

export const meta: MetaFunction = () => [
  { title: "Carbinox Credit · Loyalty that comes full circle" },
];

type Entry = {
  name: string;
  detail: string;
  amount: number;
  type: "earned" | "redeemed" | "gift";
  initials: string;
};

type EarningRule =
  | {
      id: string;
      name: string;
      kind: "first-order";
      active: boolean;
      cashbackRate: number;
    }
  | {
      id: string;
      name: string;
      kind: "tiers";
      active: boolean;
      firstThreshold: number;
      firstRate: number;
      secondThreshold: number;
      secondRate: number;
    }
  | {
      id: string;
      name: string;
      kind: "tag-delay";
      active: boolean;
      tag: string;
      delayDays: number;
      rewardAmount: number;
    };

const initialRules: EarningRule[] = [
  {
    id: "first-order",
    name: "First order welcome",
    kind: "first-order",
    active: true,
    cashbackRate: 10,
  },
  {
    id: "order-tiers",
    name: "Stacked order cashback",
    kind: "tiers",
    active: true,
    firstThreshold: 200,
    firstRate: 15,
    secondThreshold: 500,
    secondRate: 20,
  },
  {
    id: "tag-loyalty",
    name: "Long-term subscriber reward",
    kind: "tag-delay",
    active: true,
    tag: "LONG-TERM-SUBSCRIBER",
    delayDays: 30,
    rewardAmount: 25,
  },
];

const initialEntries: Entry[] = [
  {
    name: "Maya Chen",
    detail: "Order #CN-2841 · Cashback",
    amount: 18.4,
    type: "earned",
    initials: "MC",
  },
  {
    name: "Noah Williams",
    detail: "Surprise credit · 2 year member",
    amount: 25,
    type: "gift",
    initials: "NW",
  },
  {
    name: "Sofia Patel",
    detail: "Order #CN-2837 · Credit redeemed",
    amount: -32,
    type: "redeemed",
    initials: "SP",
  },
  {
    name: "Ethan Brooks",
    detail: "Order #CN-2832 · Cashback",
    amount: 12.9,
    type: "earned",
    initials: "EB",
  },
];

const money = (value: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR" }).format(
    value,
  );

export default function Preview() {
  const [entries, setEntries] = useState(initialEntries);
  const [toast, setToast] = useState("");
  const [rules, setRules] = useState(initialRules);
  const [showRule, setShowRule] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleKind, setRuleKind] = useState<
    "first-order" | "tiers" | "tag-delay"
  >("first-order");
  const [ruleName, setRuleName] = useState("");
  const [firstOrderRate, setFirstOrderRate] = useState("10");
  const [firstThreshold, setFirstThreshold] = useState("200");
  const [firstRate, setFirstRate] = useState("15");
  const [secondThreshold, setSecondThreshold] = useState("500");
  const [secondRate, setSecondRate] = useState("20");
  const [ruleTag, setRuleTag] = useState("LONG-TERM-SUBSCRIBER");
  const [delayDays, setDelayDays] = useState("30");
  const [rewardAmount, setRewardAmount] = useState("25");
  const [showGift, setShowGift] = useState(false);
  const [giftAmount, setGiftAmount] = useState("25");
  const [customer, setCustomer] = useState("Maya Chen");

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  };

  const addGift = () => {
    const amount = Number(giftAmount);
    if (!amount || amount <= 0) return;
    setEntries([
      {
        name: customer,
        detail: "Surprise credit · Manual award",
        amount,
        type: "gift",
        initials: customer
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
      },
      ...entries,
    ]);
    setShowGift(false);
    notify(`${money(amount)} demo credit awarded to ${customer}`);
  };

  const openRuleEditor = (rule?: EarningRule) => {
    setEditingRuleId(rule?.id ?? null);
    setRuleKind(rule?.kind ?? "first-order");
    setRuleName(rule?.name ?? "New automation");
    if (rule?.kind === "first-order") {
      setFirstOrderRate(String(rule.cashbackRate));
    } else if (rule?.kind === "tiers") {
      setFirstThreshold(String(rule.firstThreshold));
      setFirstRate(String(rule.firstRate));
      setSecondThreshold(String(rule.secondThreshold));
      setSecondRate(String(rule.secondRate));
    } else if (rule?.kind === "tag-delay") {
      setRuleTag(rule?.tag ?? "LONG-TERM-SUBSCRIBER");
      setDelayDays(String(rule?.delayDays ?? 30));
      setRewardAmount(String(rule?.rewardAmount ?? 25));
    } else {
      setFirstOrderRate("10");
      setFirstThreshold("200");
      setFirstRate("15");
      setSecondThreshold("500");
      setSecondRate("20");
      setRuleTag("LONG-TERM-SUBSCRIBER");
      setDelayDays("30");
      setRewardAmount("25");
    }
    setShowRule(true);
  };

  const saveRule = () => {
    const id = editingRuleId ?? `demo-rule-${Date.now()}`;
    const name = ruleName.trim() || "Custom automation";
    const existingRule = rules.find((rule) => rule.id === editingRuleId);
    const active = editingRuleId ? (existingRule?.active ?? true) : true;
    const updatedRule: EarningRule =
      ruleKind === "first-order"
        ? {
            id,
            name,
            kind: "first-order",
            active,
            cashbackRate: Math.max(0, Number(firstOrderRate) || 0),
          }
        : ruleKind === "tiers"
        ? {
            id,
            name,
            kind: "tiers",
            active,
            firstThreshold: Math.max(0, Number(firstThreshold) || 0),
            firstRate: Math.max(0, Number(firstRate) || 0),
            secondThreshold: Math.max(0, Number(secondThreshold) || 0),
            secondRate: Math.max(0, Number(secondRate) || 0),
          }
        : {
            id,
            name,
            kind: "tag-delay",
            active,
            tag: ruleTag.trim() || "CUSTOMER-TAG",
            delayDays: Math.max(1, Number(delayDays) || 1),
            rewardAmount: Math.max(0, Number(rewardAmount) || 0),
          };

    setRules((currentRules) =>
      editingRuleId
        ? currentRules.map((rule) =>
            rule.id === editingRuleId ? updatedRule : rule,
          )
        : [...currentRules, updatedRule],
    );
    setShowRule(false);
    notify("Demo automation saved");
  };

  const toggleRule = (ruleId: string) => {
    setRules((currentRules) =>
      currentRules.map((rule) =>
        rule.id === ruleId ? { ...rule, active: !rule.active } : rule,
      ),
    );
  };

  const tierRule = rules.find(
    (rule): rule is Extract<EarningRule, { kind: "tiers" }> =>
      rule.kind === "tiers" && rule.active,
  );
  const stackedReward = tierRule
    ? ((550 > tierRule.firstThreshold ? tierRule.firstRate : 0) +
        (550 > tierRule.secondThreshold ? tierRule.secondRate : 0)) /
      100
    : 0;

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <a
          className={styles.brand}
          href="#top"
          aria-label="Carbinox Credit home"
        >
          <span className={styles.brandMark}>C</span>
          <span>
            CARBINOX<span className={styles.brandSub}>CREDIT</span>
          </span>
        </a>
        <div className={styles.shopSwitch}>
          <span className={styles.shopIcon}>C</span>
          <span>
            <b>Carbinox Store</b>
            <small>carbinox.com</small>
          </span>
          <span className={styles.chevron}>⌄</span>
        </div>
        <div className={styles.navLabel}>WORKSPACE</div>
        <nav className={styles.nav}>
          <a className={styles.navActive} href="#overview">
            <span>▦</span> Overview
          </a>
          <a href="#activity">
            <span>↗</span> Activity
          </a>
          <a href="#customers">
            <span>♙</span> Customers
          </a>
          <a href="#rules">
            <span>◈</span> Earning rules
          </a>
        </nav>
        <div className={styles.sidebarBottom}>
          <div className={styles.helpIcon}>?</div>
          <div>
            <b>Need a hand?</b>
            <small>Read the quick start guide</small>
          </div>
          <span className={styles.chevron}>↗</span>
        </div>
        <div className={styles.profile}>
          <div className={styles.avatar}>SC</div>
          <div>
            <b>Sammie Carbinox</b>
            <small>Store owner</small>
          </div>
          <span className={styles.chevron}>···</span>
        </div>
      </aside>

      <section className={styles.main} id="top">
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}>
            Apps <span>/</span> <b>Carbinox Credit</b>
          </div>
          <div className={styles.topRight}>
            <span className={styles.shopifyPill}>
              <i /> DEMO MODE
            </span>
            <button className={styles.iconButton} aria-label="Notifications">
              ♧<i />
            </button>
            <div className={styles.avatarSmall}>SC</div>
          </div>
        </header>
        <div className={styles.content} id="overview">
          <div className={styles.demoBanner}>
            <span className={styles.demoDot} />
            <span>
              <b>Preview mode</b> &nbsp;Sample data only. No Shopify store is
              connected and no real credit is issued.
            </span>
            <a
              href="https://shopify.dev/docs/apps/build/cli-for-apps"
              target="_blank"
              rel="noreferrer"
            >
              About setup ↗
            </a>
          </div>
          <div className={styles.pageIntro}>
            <div>
              <div className={styles.eyebrow}>YOUR STORE, AT A GLANCE</div>
              <h1>
                Credit that keeps
                <br className={styles.mobileBreak} /> customers coming back.
              </h1>
              <p>
                Reward loyalty with real store credit, automatically or on your
                terms.
              </p>
            </div>
            <button
              className={styles.primaryButton}
              onClick={() => setShowGift(true)}
            >
              <span>＋</span> Award credit
            </button>
          </div>

          <div className={styles.statGrid}>
            <article className={styles.statCard}>
              <div className={styles.statHead}>
                OUTSTANDING CREDIT <span className={styles.info}>i</span>
              </div>
              <div className={styles.statValue}>{money(2846.5)}</div>
              <div className={styles.statFoot}>
                <span className={styles.positive}>↗ 12.8%</span>{" "}
                <span>vs. last month</span>
                <div className={styles.sparkline}>
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            </article>
            <article className={styles.statCard}>
              <div className={styles.statHead}>
                CREDIT EARNED <span className={styles.info}>i</span>
              </div>
              <div className={styles.statValue}>{money(1294.2)}</div>
              <div className={styles.statFoot}>
                <span className={styles.positive}>↗ 8.2%</span>{" "}
                <span>vs. last month</span>
                <div className={styles.sparkline}>
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            </article>
            <article className={styles.statCard}>
              <div className={styles.statHead}>
                CREDIT REDEEMED <span className={styles.info}>i</span>
              </div>
              <div className={styles.statValue}>{money(876.35)}</div>
              <div className={styles.statFoot}>
                <span className={styles.positive}>↗ 5.4%</span>{" "}
                <span>vs. last month</span>
                <div className={styles.sparkline}>
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            </article>
            <article className={styles.statCard}>
              <div className={styles.statHead}>
                REPEAT PURCHASE RATE <span className={styles.info}>i</span>
              </div>
              <div className={styles.statValue}>
                34.6<span className={styles.statUnit}>%</span>
              </div>
              <div className={styles.statFoot}>
                <span className={styles.positive}>↗ 3.1%</span>{" "}
                <span>vs. last month</span>
                <div className={styles.sparkline}>
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            </article>
          </div>

          <div className={styles.columns}>
            <section className={styles.panel} id="rules">
              <div className={styles.panelHeader}>
                <div>
                  <div className={styles.eyebrow}>AUTOMATION</div>
                  <h2>Automations</h2>
                </div>
                <span className={styles.liveBadge}>
                  <i /> {rules.filter((rule) => rule.active).length} ACTIVE
                </span>
              </div>
              <div className={styles.ruleList}>
                {rules.map((rule) => (
                  <article className={styles.ruleCard} key={rule.id}>
                    <div className={styles.ruleIcon}>
                      {rule.kind === "first-order"
                        ? "1"
                        : rule.kind === "tiers"
                          ? "↗"
                          : "♧"}
                    </div>
                    <div className={styles.ruleInfo}>
                      <b>{rule.name}</b>
                      {rule.kind === "first-order" ? (
                        <span>First-ever paid order · {rule.cashbackRate}% cashback</span>
                      ) : rule.kind === "tiers" ? (
                        <span>
                          Over {money(rule.firstThreshold)}: {rule.firstRate}% +
                          over {money(rule.secondThreshold)}: {rule.secondRate}%
                          {" · Stacks"}
                        </span>
                      ) : (
                        <span>
                          Keep tag “{rule.tag}” for {rule.delayDays} days →{" "}
                          {money(rule.rewardAmount)} credit
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className={styles.ruleEdit}
                      onClick={() => openRuleEditor(rule)}
                      aria-label={`Edit ${rule.name}`}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={[styles.toggle, rule.active && styles.toggleOn]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => toggleRule(rule.id)}
                      aria-label={`${rule.active ? "Pause" : "Activate"} ${rule.name}`}
                      aria-pressed={rule.active}
                    >
                      <i />
                    </button>
                    <div className={styles.ruleFlow}>
                      <span>
                        <small>TRIGGER</small>
                        {rule.kind === "tag-delay" ? "Tag applied" : "Order paid"}
                      </span>
                      <b aria-hidden="true">→</b>
                      <span>
                        <small>
                          {rule.kind === "tag-delay" ? "WAIT + CHECK" : "CONDITION"}
                        </small>
                        {rule.kind === "first-order"
                          ? "First ever order"
                          : rule.kind === "tiers"
                            ? `Over ${money(rule.firstThreshold)} / ${money(rule.secondThreshold)}`
                            : `${rule.delayDays} days · tag still present`}
                      </span>
                      <b aria-hidden="true">→</b>
                      <span>
                        <small>ACTION</small>
                        {rule.kind === "first-order"
                          ? `${rule.cashbackRate}% cashback`
                          : rule.kind === "tiers"
                            ? `${rule.firstRate}% + ${rule.secondRate}% credit`
                            : `Award ${money(rule.rewardAmount)}`}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
              <div className={styles.ruleStackNote}>
                {tierRule ? (
                  <>
                    Order rules stack: a {money(550)} order earns{" "}
                    {money(550 * stackedReward)}.
                  </>
                ) : (
                  "No order threshold rule is active."
                )}
              </div>
              <div className={styles.ruleActions}>
                <button
                  className={styles.textButton}
                  onClick={() => openRuleEditor()}
                >
                  + Create automation
                </button>
              </div>
            </section>

            <section className={styles.panel} id="customers">
              <div className={styles.panelHeader}>
                <div>
                  <div className={styles.eyebrow}>CUSTOMER SPOTLIGHT</div>
                  <h2>Credit creates momentum.</h2>
                </div>
                <span className={styles.arrowBadge}>↗</span>
              </div>
              <div className={styles.spotlight}>
                <div className={styles.spotlightTop}>
                  <div className={styles.customerAvatar}>MC</div>
                  <div>
                    <b>Maya Chen</b>
                    <span>LOYALTY MEMBER SINCE 2022</span>
                  </div>
                </div>
                <div className={styles.balanceLine}>
                  <span>AVAILABLE CREDIT</span>
                  <b>{money(42.8)}</b>
                </div>
                <div className={styles.spotlightFoot}>
                  <span>
                    Lifetime earned <b>{money(126.4)}</b>
                  </span>
                  <span>
                    Orders <b>8</b>
                  </span>
                </div>
              </div>
              <div className={styles.miniNote}>
                <span className={styles.noteIcon}>✳</span>
                <span>
                  <b>A little appreciation goes a long way.</b>
                  <small>
                    Send a surprise credit to a loyal customer anytime.
                  </small>
                </span>
                <button
                  onClick={() => {
                    setCustomer("Maya Chen");
                    setShowGift(true);
                  }}
                  aria-label="Award Maya credit"
                >
                  →
                </button>
              </div>
            </section>
          </div>

          <section
            className={`${styles.panel} ${styles.activityPanel}`}
            id="activity"
          >
            <div className={styles.panelHeader}>
              <div>
                <div className={styles.eyebrow}>LATEST MOVEMENT</div>
                <h2>Recent activity</h2>
              </div>
              <button className={styles.textButton}>
                View all activity <span>→</span>
              </button>
            </div>
            <div className={styles.tableHead}>
              <span>CUSTOMER</span>
              <span>DETAILS</span>
              <span>TYPE</span>
              <span>AMOUNT</span>
            </div>
            <div className={styles.rows}>
              {entries.slice(0, 4).map((entry, index) => (
                <div className={styles.row} key={`${entry.name}-${index}`}>
                  <div className={styles.person}>
                    <div className={styles.tableAvatar}>{entry.initials}</div>
                    <b>{entry.name}</b>
                  </div>
                  <span className={styles.detail}>{entry.detail}</span>
                  <span className={`${styles.type} ${styles[entry.type]}`}>
                    {entry.type === "earned"
                      ? "Earned"
                      : entry.type === "gift"
                        ? "Awarded"
                        : "Redeemed"}
                  </span>
                  <b
                    className={`${styles.amount} ${entry.amount < 0 ? styles.negative : ""}`}
                  >
                    {entry.amount < 0 ? "−" : "+"}
                    {money(Math.abs(entry.amount))}
                  </b>
                </div>
              ))}
            </div>
            <div className={styles.tableFooter}>
              Showing sample activity <span>All amounts in EUR</span>
            </div>
          </section>
          <footer className={styles.footer}>
            <span>
              CARBINOX CREDIT <b>·</b> BUILT FOR THE LONG HAUL
            </span>
            <span>
              Store credit is for purchases at your store and has no cash value.
            </span>
          </footer>
        </div>
      </section>

      {toast && (
        <div className={styles.toast}>
          <span>✓</span>
          {toast}
        </div>
      )}
      {(showGift || showRule) && (
        <div className={styles.modalBackdrop}>
          <button
            type="button"
            className={styles.modalScrim}
            aria-label="Close dialog"
            onClick={() => {
              setShowGift(false);
              setShowRule(false);
            }}
          />
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="credit-modal-title"
          >
            <button
              type="button"
              className={styles.modalClose}
              aria-label="Close dialog"
              onClick={() => {
                setShowGift(false);
                setShowRule(false);
              }}
            >
              ×
            </button>
            <div className={styles.eyebrow}>
              {showGift ? "A PERSONAL THANK YOU" : "AUTOMATED REWARD"}
            </div>
            <h2 id="credit-modal-title">
              {showGift
                ? "Award store credit"
                : editingRuleId
                  ? "Edit automation"
                  : "Create automation"}
            </h2>
            <p>
              {showGift
                ? "Add a little extra to a customer’s next order."
                : "Build a mock rule using order thresholds or customer tags."}
            </p>
            {showGift ? (
              <>
                <label>
                  Customer
                  <select
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                  >
                    <option>Maya Chen</option>
                    <option>Noah Williams</option>
                    <option>Sofia Patel</option>
                    <option>Ethan Brooks</option>
                  </select>
                </label>
                <label>
                  Credit amount
                  <input
                    type="number"
                    min="1"
                    value={giftAmount}
                    onChange={(e) => setGiftAmount(e.target.value)}
                  />
                </label>
                <small className={styles.modalHint}>
                  This preview updates sample activity only.
                </small>
                <button className={styles.primaryButton} onClick={addGift}>
                  Award {money(Number(giftAmount) || 0)} credit
                </button>
              </>
            ) : (
              <>
                <label>
                  Rule name
                  <input
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    maxLength={80}
                  />
                </label>
                <label>
                  Rule type
                  <select
                    value={ruleKind}
                    onChange={(e) =>
                      setRuleKind(
                        e.target.value as "first-order" | "tiers" | "tag-delay",
                      )
                    }
                  >
                    <option value="first-order">First order only</option>
                    <option value="tiers">Stacked order thresholds</option>
                    <option value="tag-delay">Tag retained after a delay</option>
                  </select>
                </label>
                {ruleKind === "first-order" ? (
                  <>
                    <div className={styles.modalFlow}>
                      <span>Order paid</span>
                      <b aria-hidden="true">→</b>
                      <span>First-ever order only</span>
                      <b aria-hidden="true">→</b>
                      <span>Issue cashback</span>
                    </div>
                    <label>
                      Cashback percentage
                      <div className={styles.rateInput}>
                        <input
                          type="number"
                          min="0.01"
                          max="100"
                          step="0.01"
                          value={firstOrderRate}
                          onChange={(e) => setFirstOrderRate(e.target.value)}
                        />
                        <span>%</span>
                      </div>
                    </label>
                  </>
                ) : ruleKind === "tiers" ? (
                  <>
                    <div className={styles.tierInputs}>
                      <label>
                        Spend over
                        <div className={styles.rateInput}>
                          <input
                            type="number"
                            min="1"
                            value={firstThreshold}
                            onChange={(e) => setFirstThreshold(e.target.value)}
                          />
                          <span>€</span>
                        </div>
                      </label>
                      <label>
                        Cashback
                        <div className={styles.rateInput}>
                          <input
                            type="number"
                            min="0.01"
                            max="100"
                            step="0.01"
                            value={firstRate}
                            onChange={(e) => setFirstRate(e.target.value)}
                          />
                          <span>%</span>
                        </div>
                      </label>
                      <label>
                        Spend over
                        <div className={styles.rateInput}>
                          <input
                            type="number"
                            min="1"
                            value={secondThreshold}
                            onChange={(e) => setSecondThreshold(e.target.value)}
                          />
                          <span>€</span>
                        </div>
                      </label>
                      <label>
                        Cashback
                        <div className={styles.rateInput}>
                          <input
                            type="number"
                            min="0.01"
                            max="100"
                            step="0.01"
                            value={secondRate}
                            onChange={(e) => setSecondRate(e.target.value)}
                          />
                          <span>%</span>
                        </div>
                      </label>
                    </div>
                    <div className={styles.modalExample}>
                      <b>Stacking is on</b>
                      <span>
                        An order over {money(Number(secondThreshold) || 0)} earns{" "}
                        {(Number(firstRate) || 0) + (Number(secondRate) || 0)}%
                        {" "}combined cashback.
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <label>
                      Shopify customer tag
                      <input
                        value={ruleTag}
                        onChange={(e) => setRuleTag(e.target.value)}
                        maxLength={255}
                        placeholder="LONG-TERM-SUBSCRIBER"
                      />
                    </label>
                    <div className={styles.tierInputs}>
                      <label>
                        Wait days
                        <input
                          type="number"
                          min="1"
                          value={delayDays}
                          onChange={(e) => setDelayDays(e.target.value)}
                        />
                      </label>
                      <label>
                        Store credit (€)
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={rewardAmount}
                          onChange={(e) => setRewardAmount(e.target.value)}
                        />
                      </label>
                    </div>
                    <div className={styles.modalExample}>
                      <b>Tag check before reward</b>
                      <span>
                        After {delayDays || "0"} days, confirm “{ruleTag || "tag"}”
                        {" "}is still present, then award {money(Number(rewardAmount) || 0)}.
                      </span>
                    </div>
                  </>
                )}
                <small className={styles.modalHint}>
                  Demo only: saving changes this preview, not Shopify.
                </small>
                <button className={styles.primaryButton} onClick={saveRule}>
                  Save demo automation
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
