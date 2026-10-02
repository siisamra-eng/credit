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

type Trigger = "order_paid" | "order_created" | "customer_tag_added" | "subscription_renewed" | "customer_created";
type Condition = { id: string; field: string; operator: string; value: string };
type Reward = { id: string; kind: "cashback" | "fixed_credit" | "multiplier"; value: string };
type EarningRule = { id: string; name: string; active: boolean; trigger: Trigger; match: "all" | "any"; conditions: Condition[]; delayDays: string; recheck: boolean; stackRewards: boolean; rewards: Reward[] };

const triggerLabels: Record<Trigger, string> = {
  order_paid: "Order paid", order_created: "Order created", customer_tag_added: "Customer tag added",
  subscription_renewed: "Subscription renewed", customer_created: "Customer created",
};
const fieldLabels: Record<string, string> = {
  order_count: "Order count", order_subtotal: "Order subtotal", customer_tag: "Customer tag",
  customer_tenure: "Customer tenure (days)", subscription_status: "Subscription status", first_order: "First order",
};
const rewardLabels: Record<Reward["kind"], string> = { cashback: "Cashback %", fixed_credit: "Fixed credit €", multiplier: "Credit multiplier ×" };
const condition = (field: string, operator: string, value: string): Condition => ({ id: `condition-${Math.random().toString(36).slice(2, 9)}`, field, operator, value });
const reward = (kind: Reward["kind"], value: string): Reward => ({ id: `reward-${Math.random().toString(36).slice(2, 9)}`, kind, value });

const initialRules: EarningRule[] = [
  {
    id: "first-order",
    name: "First order welcome",
    active: true,
    trigger: "order_paid", match: "all", conditions: [condition("first_order", "is", "true")], delayDays: "0", recheck: false, stackRewards: false, rewards: [reward("cashback", "10")],
  },
  {
    id: "order-tiers",
    name: "Stacked order cashback",
    active: true,
    trigger: "order_paid", match: "all", conditions: [condition("order_subtotal", "greater_than", "200"), condition("order_subtotal", "greater_than", "500")], delayDays: "0", recheck: false, stackRewards: true, rewards: [reward("cashback", "15"), reward("cashback", "20")],
  },
  {
    id: "tag-loyalty",
    name: "Long-term subscriber reward",
    active: true,
    trigger: "customer_tag_added", match: "all", conditions: [condition("customer_tag", "contains", "LONG-TERM-SUBSCRIBER")], delayDays: "30", recheck: true, stackRewards: false, rewards: [reward("fixed_credit", "25")],
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
  const [builder, setBuilder] = useState<Omit<EarningRule, "id" | "active">>({
    name: "New automation", trigger: "order_paid", match: "all",
    conditions: [condition("first_order", "is", "true")], delayDays: "0", recheck: false,
    stackRewards: false, rewards: [reward("cashback", "10")],
  });
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
    const draft = rule ? {
      name: rule.name, trigger: rule.trigger, match: rule.match, conditions: rule.conditions,
      delayDays: rule.delayDays, recheck: rule.recheck, stackRewards: rule.stackRewards, rewards: rule.rewards,
    } : {
      name: "New automation", trigger: "order_paid" as Trigger, match: "all" as const,
      conditions: [condition("first_order", "is", "true")], delayDays: "0", recheck: false,
      stackRewards: false, rewards: [reward("cashback", "10")],
    };
    setBuilder({ ...draft, conditions: draft.conditions.map((item) => ({ ...item })), rewards: draft.rewards.map((item) => ({ ...item })) });
    setShowRule(true);
  };

  const saveRule = () => {
    const id = editingRuleId ?? `demo-rule-${Date.now()}`;
    const name = builder.name.trim() || "Custom automation";
    const existingRule = rules.find((rule) => rule.id === editingRuleId);
    const active = editingRuleId ? (existingRule?.active ?? true) : true;
    const updatedRule: EarningRule = { ...builder, id, name, active };

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

  const tierRule = rules.find((rule) => rule.stackRewards && rule.active);
  const stackedReward = tierRule
    ? tierRule.rewards.reduce((sum, item) => sum + (item.kind === "cashback" && 550 > Number(tierRule.conditions.find((entry) => entry.field === "order_subtotal")?.value ?? 0) ? Number(item.value) / 100 : 0), 0)
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
                      {rule.trigger === "customer_tag_added" ? "♧" : rule.trigger === "subscription_renewed" ? "↻" : "↗"}
                    </div>
                    <div className={styles.ruleInfo}>
                      <b>{rule.name}</b>
                      <span>{triggerLabels[rule.trigger]} · {rule.conditions.length} condition{rule.conditions.length === 1 ? "" : "s"} · {rule.rewards.length} reward{rule.rewards.length === 1 ? "" : "s"}{rule.stackRewards ? " · Stacked" : ""}</span>
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
                        {triggerLabels[rule.trigger]}
                      </span>
                      <b aria-hidden="true">→</b>
                      <span>
                        <small>
                          {rule.delayDays !== "0" ? "WAIT + RECHECK" : "CONDITIONS"}
                        </small>
                        {rule.conditions.map((item) => `${fieldLabels[item.field] ?? item.field} ${item.operator.replaceAll("_", " ")} ${item.value}`).join(rule.match === "all" ? " · AND · " : " · OR · ") || "No conditions"}{rule.delayDays !== "0" ? ` · ${rule.delayDays}d delay${rule.recheck ? " + recheck" : ""}` : ""}
                      </span>
                      <b aria-hidden="true">→</b>
                      <span>
                        <small>ACTION</small>
                        {rule.rewards.map((item) => `${item.value}${item.kind === "cashback" ? "% cashback" : item.kind === "fixed_credit" ? "€ credit" : "× multiplier"}`).join(rule.stackRewards ? " + " : " / ") || "No rewards"}
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
            className={`${styles.modal} ${showRule ? styles.modalWide : ""}`}
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
                : "Combine triggers, conditions, delays, and reward actions into a workflow."}
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
                <label>Automation name<input value={builder.name} onChange={(e) => setBuilder({ ...builder, name: e.target.value })} maxLength={80} /></label>
                <div className={styles.builderBlock}>
                  <div className={styles.builderHeading}><span className={styles.builderStep}>1</span><div><b>When this happens</b><small>Choose the event that starts the automation.</small></div></div>
                  <label>Trigger<select value={builder.trigger} onChange={(e) => setBuilder({ ...builder, trigger: e.target.value as Trigger })}>{Object.entries(triggerLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                </div>
                <div className={styles.builderBlock}>
                  <div className={styles.builderHeading}><span className={styles.builderStep}>2</span><div><b>Check these conditions</b><small>Continue when {builder.match === "all" ? "all" : "any"} conditions match.</small></div></div>
                  <label>Condition logic<select value={builder.match} onChange={(e) => setBuilder({ ...builder, match: e.target.value as "all" | "any" })}><option value="all">All conditions (AND)</option><option value="any">Any condition (OR)</option></select></label>
                  <div className={styles.builderRows}>{builder.conditions.map((item, index) => <div className={styles.builderRow} key={item.id}>
                    {index > 0 && <span className={styles.logicJoin}>{builder.match === "all" ? "AND" : "OR"}</span>}
                    <select aria-label="Condition field" value={item.field} onChange={(e) => setBuilder({ ...builder, conditions: builder.conditions.map((row) => row.id === item.id ? { ...row, field: e.target.value, operator: e.target.value === "customer_tag" ? "contains" : e.target.value === "first_order" ? "is" : "greater_than" } : row) })}>{Object.entries(fieldLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
                    <select aria-label="Condition operator" value={item.operator} onChange={(e) => setBuilder({ ...builder, conditions: builder.conditions.map((row) => row.id === item.id ? { ...row, operator: e.target.value } : row) })}><option value="greater_than">is greater than</option><option value="less_than">is less than</option><option value="equals">equals</option><option value="contains">contains</option><option value="is">is</option></select>
                    <input aria-label="Condition value" value={item.value} onChange={(e) => setBuilder({ ...builder, conditions: builder.conditions.map((row) => row.id === item.id ? { ...row, value: e.target.value } : row) })} placeholder="Value" />
                    <button type="button" className={styles.removeStep} aria-label="Remove condition" disabled={builder.conditions.length === 1} onClick={() => setBuilder({ ...builder, conditions: builder.conditions.filter((row) => row.id !== item.id) })}>×</button>
                  </div>)}</div>
                  <button type="button" className={styles.addStep} onClick={() => setBuilder({ ...builder, conditions: [...builder.conditions, condition("order_subtotal", "greater_than", "100")] })}>＋ Add condition</button>
                </div>
                <div className={styles.builderBlock}>
                  <div className={styles.builderHeading}><span className={styles.builderStep}>3</span><div><b>Wait, then check again</b><small>Optional delay for tag and lifecycle automations.</small></div></div>
                  <div className={styles.builderInline}><label>Delay<input type="number" min="0" value={builder.delayDays} onChange={(e) => setBuilder({ ...builder, delayDays: e.target.value })} /></label><span>days</span><label className={styles.checkLabel}><input type="checkbox" checked={builder.recheck} onChange={(e) => setBuilder({ ...builder, recheck: e.target.checked })} /> Recheck conditions before rewarding</label></div>
                </div>
                <div className={styles.builderBlock}>
                  <div className={styles.builderHeading}><span className={styles.builderStep}>4</span><div><b>Then issue these rewards</b><small>Add multiple actions and decide whether they stack.</small></div></div>
                  <div className={styles.builderRows}>{builder.rewards.map((item) => <div className={styles.builderRow} key={item.id}>
                    <select aria-label="Reward type" value={item.kind} onChange={(e) => setBuilder({ ...builder, rewards: builder.rewards.map((row) => row.id === item.id ? { ...row, kind: e.target.value as Reward["kind"] } : row) })}>{Object.entries(rewardLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
                    <input aria-label="Reward amount" type="number" min="0" step="0.1" value={item.value} onChange={(e) => setBuilder({ ...builder, rewards: builder.rewards.map((row) => row.id === item.id ? { ...row, value: e.target.value } : row) })} />
                    <button type="button" className={styles.removeStep} aria-label="Remove reward" disabled={builder.rewards.length === 1} onClick={() => setBuilder({ ...builder, rewards: builder.rewards.filter((row) => row.id !== item.id) })}>×</button>
                  </div>)}</div>
                  <button type="button" className={styles.addStep} onClick={() => setBuilder({ ...builder, rewards: [...builder.rewards, reward("cashback", "5")] })}>＋ Add reward action</button>
                  <div className={styles.stackControl}><input aria-label="Stack matching rewards" type="checkbox" checked={builder.stackRewards} onChange={(e) => setBuilder({ ...builder, stackRewards: e.target.checked })} /><span><b>Stack matching rewards</b><small>{builder.stackRewards ? "Every matching reward action is combined." : "Only the single highest-value matching reward applies."}</small></span></div>
                </div>
                <div className={styles.builderPreview}><span className={styles.eyebrow}>LIVE FLOW PREVIEW · MOCK DATA</span><div><b>WHEN</b> {triggerLabels[builder.trigger]}</div><div><b>IF</b> {builder.conditions.map((item) => `${fieldLabels[item.field] ?? item.field} ${item.operator.replaceAll("_", " ")} ${item.value}`).join(builder.match === "all" ? " AND " : " OR ") || "no conditions"}</div>{Number(builder.delayDays) > 0 && <div><b>WAIT</b> {builder.delayDays} days{builder.recheck ? " · recheck conditions" : ""}</div>}<div><b>THEN</b> {builder.rewards.map((item) => `${item.value}${item.kind === "cashback" ? "% cashback" : item.kind === "fixed_credit" ? "€ credit" : "× multiplier"}`).join(builder.stackRewards ? " + " : " / ")}{builder.stackRewards ? " · stack" : " · best match"}</div></div>
                <small className={styles.modalHint}>Demo only: saving updates this preview, not Shopify. No real credit is issued.</small>
                <button className={styles.primaryButton} onClick={saveRule}>Save demo automation</button>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
