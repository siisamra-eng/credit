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
  const [rate, setRate] = useState(10);
  const [enabled, setEnabled] = useState(true);
  const [showRule, setShowRule] = useState(false);
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
                  <h2>Your cashback rule</h2>
                </div>
                <span className={styles.liveBadge}>
                  <i /> {enabled ? "ACTIVE" : "PAUSED"}
                </span>
              </div>
              <div className={styles.ruleCard}>
                <div className={styles.ruleIcon}>↻</div>
                <div className={styles.ruleInfo}>
                  <b>Every order earns {rate}% back</b>
                  <span>Credit applies to eligible items after discounts.</span>
                </div>
                <button
                  className={`${styles.toggle} ${enabled ? styles.toggleOn : ""}`}
                  onClick={() => setEnabled(!enabled)}
                  aria-label="Toggle cashback rule"
                >
                  <i />
                </button>
              </div>
              <div className={styles.ruleMeta}>
                <div>
                  <span>REWARD RATE</span>
                  <b>
                    {rate}% <small>of eligible spend</small>
                  </b>
                </div>
                <div>
                  <span>ELIGIBLE CUSTOMERS</span>
                  <b>All customers</b>
                </div>
                <div>
                  <span>REDEMPTION</span>
                  <b>At checkout</b>
                </div>
              </div>
              <button
                className={styles.textButton}
                onClick={() => setShowRule(true)}
              >
                Edit earning rule <span>→</span>
              </button>
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
              {showGift ? "Award store credit" : "Edit cashback rule"}
            </h2>
            <p>
              {showGift
                ? "Add a little extra to a customer’s next order."
                : "Set the percentage customers earn from eligible spend."}
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
                  Cashback percentage
                  <div className={styles.rateInput}>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={rate}
                      onChange={(e) => setRate(Number(e.target.value))}
                    />
                    <span>%</span>
                  </div>
                </label>
                <div className={styles.modalExample}>
                  <b>Example</b>
                  <span>
                    A {money(100)} eligible order earns {money(rate)} in store
                    credit.
                  </span>
                </div>
                <button
                  className={styles.primaryButton}
                  onClick={() => {
                    setShowRule(false);
                    notify("Demo cashback rule updated");
                  }}
                >
                  Save rule
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
