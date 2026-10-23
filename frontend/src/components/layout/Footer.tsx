import { useBackground } from "@/features/apod/use-apod";

/** Small provider and photo credits, kept at the bottom of the page. */
export function Footer() {
  const background = useBackground().data;

  return (
    <footer className="mx-auto mt-12 w-full max-w-[1200px] space-y-1.5 border-t border-white/10 px-4 pt-4 pb-28 text-[10px] leading-relaxed text-pretty text-muted-foreground/75 sm:px-6 sm:text-[11px] lg:px-8 lg:pb-6">
      <p>
        Sources: Weather and air quality — OpenWeatherMap · ISS position — wheretheiss.at, with Open Notify backup · Pass times — Pollux Labs · Photos — NASA APOD · Map — Natural Earth.
      </p>
      {background && !background.is_fallback ? (
        <p className="break-words">
          Background photo: {background.title} ({background.credit}).{" "}
          {background.page_url ? (
            <a
              href={background.page_url}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              NASA source
            </a>
          ) : null}
        </p>
      ) : (
        <p>Background: generated night sky (NASA APOD unavailable).</p>
      )}
    </footer>
  );
}
