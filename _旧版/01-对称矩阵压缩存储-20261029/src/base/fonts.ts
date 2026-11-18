// 字体从 public/fonts 加载（文件从 C:\Windows\Fonts 复制，见 README）。
// loadFont 内部会 delayRender，字体没载完不会截帧，不会出现回退字体。
import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

let loaded: Promise<unknown> | null = null;

export const loadVideoFonts = (): Promise<unknown> => {
  if (!loaded) {
    loaded = Promise.all([
      loadFont({ family: "DK Sans", url: staticFile("fonts/NotoSansSC-VF.ttf"), weight: "100 900", format: "truetype" }),
      loadFont({ family: "DK Mono", url: staticFile("fonts/consola.ttf"), weight: "400", format: "truetype" }),
      loadFont({ family: "DK Mono", url: staticFile("fonts/consolab.ttf"), weight: "700", format: "truetype" }),
      loadFont({ family: "DK Math", url: staticFile("fonts/cambriai.ttf"), weight: "400", style: "italic", format: "truetype" }),
    ]);
  }
  return loaded;
};

loadVideoFonts();
