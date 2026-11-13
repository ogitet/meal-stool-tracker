import { Header } from "../components/Header";
import { ErrorRetry, Loading } from "../components/Status";
import { Tile } from "../components/Tile";
import { useUserData } from "../data/UserDataContext";
import { useNav } from "../hooks/useNav";
import { GROUPS } from "../lib/constants";

/** S-07 カテゴリ管理。グループごとに一覧し、「使わない」は末尾にまとめる。 */
export function CategoryList() {
  const { categories } = useUserData();
  const nav = useNav();
  const inactive = categories.all.filter((c) => !c.active);

  return (
    <div className="screen">
      <Header
        left={
          <button type="button" className="lnk" onClick={() => nav.back("/")}>
            ‹ 戻る
          </button>
        }
        title="カテゴリ管理"
      />
      <div className="paper">
        <div className="main">
          {categories.error ? (
            <ErrorRetry message={categories.error} />
          ) : categories.loading ? (
            <Loading />
          ) : (
            <>
              {GROUPS.map((g) => {
                const items = categories.active.filter((c) => c.group === g.id);
                if (items.length === 0) return null;
                return (
                  <section key={g.id}>
                    <h2 className="sh">{g.label}</h2>
                    <div className="list" role="list">
                      {items.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          role="listitem"
                          className="cr"
                          onClick={() => nav.go(`/categories/${c.id}`, "push")}
                        >
                          <Tile category={c} />
                          <span>{c.name}</span>
                          <span className="chev" aria-hidden="true">
                            ›
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                );
              })}
              {inactive.length > 0 && (
                <section>
                  <h2 className="sh">使わない</h2>
                  <div className="list" role="list">
                    {inactive.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        role="listitem"
                        className="cr off"
                        onClick={() => nav.go(`/categories/${c.id}`, "push")}
                      >
                        <Tile category={c} />
                        <span>{c.name}</span>
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
        <div className="bar">
          <button type="button" className="btn pri" onClick={() => nav.go("/categories/new", "open")}>
            カテゴリを追加
          </button>
        </div>
      </div>
    </div>
  );
}
