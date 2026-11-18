// 黑板主题额外的字体：便签手写数字（Ink Free，文件从 C:\Windows\Fonts\Inkfree.ttf 复制到 public/fonts）。
// 中文 / Consolas 仍由 ../base/fonts 加载（DK Sans / DK Mono）。
import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";
import { loadVideoFonts } from "../base/fonts";

let loaded: Promise<unknown> | null = null;

export const loadBoardFonts = (): Promise<unknown> => {
  if (!loaded) {
    loaded = Promise.all([
      loadVideoFonts(),
      loadFont({ family: "DK Hand", url: staticFile("fonts/Inkfree.ttf"), weight: "400", format: "truetype" }),
    ]);
  }
  return loaded;
};

loadBoardFonts();
