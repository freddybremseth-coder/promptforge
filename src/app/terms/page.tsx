export const metadata = { title: 'Vilkår · PromptForge' }

export default function TermsPage() {
  return (
    <article className="prose mx-auto max-w-3xl dark:prose-invert">
      <h1>Vilkår</h1>
      <p>
        Ved å bruke PromptForge godtar du følgende. Vilkårene er korte fordi tjenesten er
        enkel.
      </p>
      <h2>Bruk</h2>
      <p>
        Du beholder full eierskap til pakkene du genererer. Vi gjør ingen krav på dem og bruker
        ikke prompts eller pakkeinnhold til markedsføring uten ditt eksplisitte samtykke.
      </p>
      <h2>Misbruk</h2>
      <p>
        Vi kan stenge kontoer som genererer ulovlig innhold, prøver å omgå kvotaer, eller bruker
        tjenesten for å trene konkurrerende modeller via skraping.
      </p>
      <h2>Refusjon</h2>
      <p>
        Vi tilbyr full refusjon innen 14 dager etter første betaling, så lenge mindre enn 50% av
        kvoten er brukt.
      </p>
      <h2>Ansvar</h2>
      <p>
        Tjenesten leveres "som den er". Vi garanterer ikke at genererte pakker er feilfrie eller
        passer for noe bestemt formål — du må selv vurdere kvalitet før bruk i produksjon.
      </p>
    </article>
  )
}
