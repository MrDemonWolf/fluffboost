import Link from "next/link";
import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { site } from "@/lib/site";

/*
 * LEGAL REVIEW REQUIRED: this notice has not been reviewed by counsel. Have a qualified
 * privacy lawyer review it, and replace every visible TODO(owner) placeholder with
 * verified facts, before relying on it. Every statement about stored data must stay in
 * sync with apps/discord/src (database/schema.ts, commands/suggestion.ts,
 * utils/suggestionLimits.ts, utils/logger.ts, events/guildDelete.ts, utils/guildDatabase.ts).
 */

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What FluffBoost stores, why, the legal basis, who receives it, how long it is kept, and how to exercise your privacy rights.",
};

/** Visible placeholder for a fact only the operator can supply. */
function OwnerTodo({ children }: { children: string }) {
  return <mark className="rounded bg-honey/20 px-1 font-mono text-sm text-ink">[TODO(owner): {children}]</mark>;
}

const purposes: { purpose: string; data: string; basis: string }[] = [
  {
    purpose: "Deliver quotes and save a server's settings",
    data: "Discord server ID, delivery channel ID, schedule (frequency, time, day, timezone), last delivery time, and when the record was created and updated.",
    basis: "Contract: providing the service the server's administrator set up (GDPR Art. 6(1)(b)).",
  },
  {
    purpose: "Enable and check Premium",
    data: "Entitlement information from Discord (product ID, server ID, status, and dates) and the server's Premium flag.",
    basis: "Contract: providing the subscription purchased through Discord (Art. 6(1)(b)).",
  },
  {
    purpose: "Review quote suggestions and credit contributors",
    data: "Quote text, author name, submitter Discord user ID, review status, reviewer Discord user ID, and timestamps. Discord usernames and avatars are fetched from Discord when a quote or review notice is shown; they are not stored in our database.",
    basis: "Legitimate interests in running a moderated, attributed community quote library (Art. 6(1)(f)).",
  },
  {
    purpose: "Limit suggestion abuse",
    data: "Discord user ID, the IDs of recent suggestion commands, and their times, held in Redis.",
    basis: "Legitimate interests in preventing spam and keeping review manageable (Art. 6(1)(f)).",
  },
  {
    purpose: "Operate, secure, and debug the service",
    data: "Operational logs: command names, Discord usernames and user IDs, server IDs, server names and member counts on join or leave, error details, and API request method, path, and status. The bot's small HTTP API counts requests per IP address in memory for rate limiting; IP addresses are not logged.",
    basis: "Legitimate interests in keeping the service secure and working (Art. 6(1)(f)).",
  },
  {
    purpose: "Answer support and privacy requests",
    data: "Whatever you send us, plus the information needed to verify the request.",
    basis: "Legitimate interests in supporting users (Art. 6(1)(f)); legal obligation for rights requests (Art. 6(1)(c)).",
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated="2026-10-30"
      description="This policy explains what personal data the hosted FluffBoost Discord bot and this website process, why, and the choices and rights you have. Independently hosted copies of FluffBoost have their own operators and data practices."
    >
      <h2>Who is responsible</h2>
      <p>
        The controller of your personal data is MrDemonWolf, Inc. <OwnerTodo>confirm full legal entity name</OwnerTodo>,{" "}
        <OwnerTodo>postal address</OwnerTodo>.
      </p>
      <p>
        For privacy questions and requests, email <OwnerTodo>monitored privacy email address</OwnerTodo>. Please do not
        post personal data or privacy requests in public channels.
      </p>
      <p>
        <OwnerTodo>EU and UK representative under GDPR Art. 27, if one is required</OwnerTodo>
      </p>

      <h2>What we collect and why</h2>
      <p>
        The bot works through slash commands. It does not read server conversations or collect message history. Text you
        submit through a command, such as a quote or author name, is processed to carry out that command.
      </p>
      <div
        role="region"
        aria-labelledby="purposes-caption"
        tabIndex={0}
        className="not-prose my-6 max-w-full overflow-x-auto rounded-lg border border-line"
      >
        <table className="w-full min-w-[36rem] border-collapse text-left text-sm leading-relaxed text-ink-soft">
          <caption id="purposes-caption" className="px-4 pt-4 pb-2 text-left font-semibold text-ink">
            Purposes, the data used for each, and the legal basis
          </caption>
          <thead>
            <tr className="border-b border-line text-ink">
              <th scope="col" className="px-4 py-2 font-semibold">Purpose</th>
              <th scope="col" className="px-4 py-2 font-semibold">Data</th>
              <th scope="col" className="px-4 py-2 font-semibold">Legal basis</th>
            </tr>
          </thead>
          <tbody>
            {purposes.map(({ purpose, data, basis }) => (
              <tr key={purpose} className="border-b border-line align-top last:border-b-0">
                <th scope="row" className="px-4 py-3 font-semibold text-ink">{purpose}</th>
                <td className="px-4 py-3">{data}</td>
                <td className="px-4 py-3">{basis}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Where we rely on legitimate interests, you can object at any time (see Your rights). We do not rely on consent
        for the bot, and we do not make decisions with legal or similarly significant effects about you solely by
        automated means. Payment card details are handled by Discord and its payment providers; the bot never receives
        them.
      </p>

      <h2>Who receives your data</h2>
      <ul>
        <li>
          <strong>Discord</strong> carries every command, message, and subscription. It acts as an independent controller
          under the <a href="https://discord.com/privacy">Discord Privacy Policy</a>.
        </li>
        <li>
          <strong>Other FluffBoost servers:</strong> approved quote text and author attribution, shown with the
          submitter&apos;s current Discord username and avatar, can appear in any server using FluffBoost.
        </li>
        <li>
          <strong>The FluffBoost review team</strong> sees each suggestion with the submitter&apos;s username and avatar in
          its review channel on Discord. Review results are posted there and sent to the submitter by direct
          message.
        </li>
        <li>
          <strong>Bot hosting</strong> (runs the bot process): <OwnerTodo>bot hosting provider and region</OwnerTodo>.
        </li>
        <li>
          <strong>Database and Redis hosting</strong> (stores the records described above):{" "}
          <OwnerTodo>PostgreSQL and Redis hosting provider and region</OwnerTodo>.
        </li>
        <li>
          <strong>GitHub Pages</strong> hosts this website and may process request data such as IP addresses under the{" "}
          <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">
            GitHub General Privacy Statement
          </a>
          .
        </li>
      </ul>
      <p>We may also disclose data where the law requires it or to protect the service and its users from abuse.</p>

      <h3>International transfers</h3>
      <p>
        Discord and GitHub are based in the United States, so your data may be processed outside the European Economic
        Area, the United Kingdom, or your own country. Where GDPR applies, transfers rely on{" "}
        <OwnerTodo>transfer mechanism for each provider, such as EU-US Data Privacy Framework certification or Standard Contractual Clauses</OwnerTodo>
        . You can ask us for more information about these safeguards.
      </p>

      <h2>We do not sell your data</h2>
      <p>
        We do not sell personal data, share it for cross-context behavioral advertising, or use it for advertising. The
        bot and this website contain no advertising trackers or analytics.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>
          <strong>Server settings:</strong> kept while the bot is in the server. The bot deletes them when it is removed
          from the server; if that event is missed, they are deleted during the bot&apos;s next startup cleanup.
        </li>
        <li>
          <strong>Suggestion abuse limit:</strong> deleted automatically from Redis 24 hours after your most recent
          suggestion.
        </li>
        <li>
          <strong>Quote suggestions, review records, and approved quotes:</strong> kept for as long as the shared quote
          library operates, with no automatic expiry, unless you ask us to delete or anonymize them. Removing the bot
          from a server does not delete them.
        </li>
        <li>
          <strong>Operational logs:</strong> <OwnerTodo>log retention period</OwnerTodo>.
        </li>
        <li>
          <strong>Backups:</strong> <OwnerTodo>backup retention period, or state that no backups are kept</OwnerTodo>.
        </li>
        <li>
          <strong>Premium status:</strong> kept with the server settings and updated when Discord reports a change to the
          entitlement.
        </li>
      </ul>
      <p>
        Messages the bot has already posted on Discord, including delivered quotes and direct messages, are stored by
        Discord and remain under the control of Discord and the server.
      </p>

      <h2>Your rights</h2>
      <p>Depending on where you live, you have the right to:</p>
      <ul>
        <li>access your personal data and receive a copy;</li>
        <li>have inaccurate data corrected;</li>
        <li>have your data erased;</li>
        <li>restrict how we process it;</li>
        <li>receive data you gave us in a portable, machine-readable format;</li>
        <li>object to processing based on legitimate interests;</li>
        <li>withdraw consent at any time, where we rely on consent.</li>
      </ul>
      <p>
        To use these rights, email <OwnerTodo>monitored privacy email address</OwnerTodo> with the relevant Discord user
        or server ID and the records involved. We may need to verify that you control the account or server before
        acting. We respond within one month, which can be extended where the law allows. Do not send passwords, bot
        tokens, or payment card details.
      </p>
      <p>
        You also have the right to lodge a complaint with a data protection supervisory authority, in particular in the
        country where you live, work, or where you believe an infringement occurred. In the UK this is the Information
        Commissioner&apos;s Office. We would welcome the chance to address your concern first.
      </p>

      <h2>Minimum age</h2>
      <p>
        FluffBoost runs on Discord, so you must meet the minimum age to use Discord under the{" "}
        <a href="https://discord.com/terms">Discord Terms of Service</a>: at least 13, or older where your country
        requires it. FluffBoost is not directed at children below that age, and we do not knowingly collect their
        personal data. If you believe a child has submitted a quote, contact us and we will delete it.
      </p>

      <h2>This website</h2>
      <p>
        This website is a static site hosted on GitHub Pages. Its code includes no advertising trackers or analytics. A
        theme preference may be saved in your browser, and documentation search uses a static index that runs in your
        browser. Links to Discord, GitHub, and our <a href={site.companyUrl}>company website</a> lead to services with
        their own privacy policies.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We update this policy when our service or data practices change. The date at the top shows the latest revision.
        Also read the <Link href="/terms">Terms of Service</Link>.
      </p>
    </LegalPage>
  );
}
