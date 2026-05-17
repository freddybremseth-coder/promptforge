export const metadata = { title: 'Personvern · PromptForge' }

export default function PrivacyPage() {
  return (
    <article className="prose mx-auto max-w-3xl dark:prose-invert">
      <h1>Personvern</h1>
      <p>
        PromptForge er drevet av et selskap registrert i Spania. Vi lagrer kun det som er strengt
        nødvendig for å levere tjenesten.
      </p>
      <h2>Hva vi lagrer</h2>
      <ul>
        <li>E-postadresse for autentisering</li>
        <li>Prosjektmål, intervjusvar og genererte pakker (knyttet til din bruker-ID)</li>
        <li>Stripe customer-ID for fakturering — Stripe lagrer kortdata, vi gjør det ikke</li>
      </ul>
      <h2>Tredjeparter</h2>
      <p>
        Prompter sendes til Anthropic for å generere svar. Anthropic logger ikke innholdet til
        modelltrening utenfor opt-in. Stripe håndterer alle betalinger. Supabase er vår
        databasevert.
      </p>
      <h2>Dine rettigheter</h2>
      <p>
        Du kan be om eksport eller sletting av all data ved å sende en e-post til
        privacy@promptforge.dev. Vi sletter innen 30 dager.
      </p>
    </article>
  )
}
