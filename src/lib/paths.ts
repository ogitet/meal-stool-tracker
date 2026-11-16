/** 入力の途中になりうる画面（食事・便の記録、カテゴリの追加と編集）のパスか。 */
export function isEditingPath(pathname: string): boolean {
  return /^\/(meal|stool)\/./.test(pathname) || /^\/categories\/./.test(pathname);
}
