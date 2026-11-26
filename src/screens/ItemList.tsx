import { Header } from "@/components/Header";
import { ErrorRetry, Loading } from "@/components/Status";
import { useUserData } from "@/data/UserDataContext";
import { useNav } from "@/hooks/useNav";
import { canAddItem, inkOf, KIND_LABEL, KINDS } from "@/lib/items";

/** S-11 項目管理。種類ごとに一覧し、「使わない」は末尾にまとめる（Structure 7章）。 */
export function ItemList() {
  const { habits } = useUserData();
  const nav = useNav();
  const inactive = habits.all.filter((i) => !i.active);

  return (
    <div className="screen">
      <Header
        left={
          <button type="button" className="lnk" onClick={() => nav.back("/")}>
            ‹ 戻る
          </button>
        }
        title="項目管理"
      />
      <div className="paper">
        <div className="main end">
          {habits.error ? (
            <ErrorRetry message={habits.error} onRetry={habits.retry} />
          ) : habits.loading ? (
            <Loading />
          ) : (
            <>
              {KINDS.map((kind) => (
                <section key={kind}>
                  <h2 className="sh">{KIND_LABEL[kind]}</h2>
                  <div className="list">
                    {habits.active
                      .filter((i) => i.kind === kind)
                      .map((i) => (
                        <button
                          key={i.id}
                          type="button"
                          className="cr"
                          onClick={() => nav.go(`/items/${i.id}`, "push")}
                        >
                          <span className={`t g-${inkOf(i, habits.all)}`} aria-hidden="true">
                            {i.abbr}
                          </span>
                          <span>{i.name}</span>
                          <span className="chev" aria-hidden="true">
                            ›
                          </span>
                        </button>
                      ))}
                    {canAddItem(habits.all, kind) && (
                      <button type="button" className="add" onClick={() => nav.go(`/items/new?kind=${kind}`, "open")}>
                        {KIND_LABEL[kind]}を追加
                      </button>
                    )}
                  </div>
                </section>
              ))}
              {inactive.length > 0 && (
                <section>
                  <h2 className="sh">使わない</h2>
                  <div className="list">
                    {inactive.map((i) => (
                      <button
                        key={i.id}
                        type="button"
                        className="cr off"
                        onClick={() => nav.go(`/items/${i.id}`, "push")}
                      >
                        <span className={`t g-${inkOf(i, habits.all)}`} aria-hidden="true">
                          {i.abbr}
                        </span>
                        <span>
                          {i.name}
                          <small className="kind">（{KIND_LABEL[i.kind]}）</small>
                        </span>
                        <span className="chev" aria-hidden="true">
                          ›
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
