// Browser-side Daily.co integration.
// Daily is loaded dynamically only on call pages to avoid SSR issues.

export async function loadDaily() {
  const { default: DailyIframe } = await import("@daily-co/daily-js");
  return DailyIframe;
}

export function createDailyFrame(container: HTMLElement, url: string, token: string) {
  return import("@daily-co/daily-js").then(({ default: DailyIframe }) => {
    const frame = DailyIframe.createFrame(container, {
      iframeStyle: {
        width: "100%",
        height: "100%",
        border: "0",
        borderRadius: "12px",
      },
      showLeaveButton: true,
      showFullscreenButton: true,
    });

    frame.join({ url, token });
    return frame;
  });
}
