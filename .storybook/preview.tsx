/// <reference types="vite/client" />
// ↑ vp check の型チェックは .storybook に tsconfig の types を当てないため、CSS の読み込みの型をここで参照する
import type { Decorator, Preview } from "@storybook/react-vite";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createMemoryRouter, RouterProvider, useLocation } from "react-router-dom";
import { ToastProvider } from "../src/components/Toast";
import { UserDataProvider } from "../src/data/UserDataContext";
import "../src/styles/global.css";

/** 画面のストーリーで、表示する URL とルートの形を指定する（例：{ path: "/day/:date", url: "/day/2026-11-10" }）。 */
export interface RouteParameter {
  path: string;
  url: string;
}

/** ストーリーの外へ遷移したときに、行き先を示す。 */
function Navigated() {
  const { pathname, search } = useLocation();
  return <p style={{ padding: 24, fontSize: 14 }}>画面遷移：{pathname + search}</p>;
}

/**
 * ルーターは URL が変わるときだけ作り直す。ストーリー本体は Context で渡し、
 * controls で引数を変えたときにルーターの中まで再描画が届くようにする。
 */
const StoryElement = createContext<ReactNode>(null);
function StorySlot() {
  return useContext(StoryElement);
}

/** アプリと同じ前提（例データ、トースト、ルーター）で描画する。 */
const withApp: Decorator = (Story, { parameters }) => {
  const route = (parameters.route as RouteParameter | undefined) ?? { path: "/", url: "/" };
  const router = useMemo(
    () =>
      createMemoryRouter(
        [
          { path: route.path, element: <StorySlot /> },
          { path: "*", element: <Navigated /> },
        ],
        { initialEntries: [route.url] },
      ),
    [route.path, route.url],
  );
  return (
    <UserDataProvider uid="demo">
      <ToastProvider>
        <StoryElement.Provider value={<Story />}>
          <RouterProvider router={router} />
        </StoryElement.Provider>
      </ToastProvider>
    </UserDataProvider>
  );
};

const preview: Preview = {
  decorators: [withApp],
  parameters: {
    layout: "fullscreen",
    viewport: {
      options: {
        iphoneSE: { name: "iPhone SE", styles: { width: "375px", height: "667px" }, type: "mobile" },
      },
    },
    a11y: { test: "todo" },
  },
  initialGlobals: {
    viewport: { value: "iphoneSE", isRotated: false },
  },
};

export default preview;
