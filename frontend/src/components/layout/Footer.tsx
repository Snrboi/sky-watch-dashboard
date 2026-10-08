import { useBackground } from "@/features/apod/use-apod";

/** Credits every data provider (PRD section 10) and the current background photo. */
export function Footer() {
  const background = useBackground().data;

  return (
    <footer className="mx-auto mt-12 w-full max-w-[1200px] space-y-2 border-t border-white/10 px-4 pt-6 pb-28 text-xs text-pretty text-muted-foreground sm:px-6 lg:px-8 lg:pb-6">
      <p>
        Weather and air quality: OpenWeatherMap. ISS position: wheretheiss.at, with Open Notify as
        backup. Pass times: Pollux Labs. Photos: NASA APOD. Map: Natural Earth.
      </p>
      {background && !background.is_fallback ? (
        <p>
          Background: {background.title} ({background.credit}).{" "}
          {background.page_url ? (
            <a
              href={background.page_url}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              View on NASA
            </a>
          ) : null}
        </p>
      ) : (
        <p>Background: a generated night sky, because NASA has no usable picture right now.</p>
      )}
    </footer>
  );
}
