import Link from "next/link";
import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What FluffBoost stores, how quote suggestions are shared, and how to request deletion.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" description="FluffBoost is operated by MrDemonWolf, Inc. This policy covers the hosted Discord bot and this website. Independently hosted copies have their own operators and data practices.">
      <h2>Data we process</h2>
      <ul>
        <li><strong>Server configuration:</strong> Discord server ID, selected delivery channel ID, schedule, timezone, Premium status, last delivery time, and configuration timestamps.</li>
        <li><strong>Quote submissions:</strong> quote text, author attribution, submitter Discord user ID, submission time, review status, reviewer Discord user ID, and review timestamps. Approved quotes retain their attribution and submitter ID in the shared library.</li>
        <li><strong>Discord interactions and operations:</strong> command names, usernames, user IDs, server IDs, server names, and diagnostic errors can appear in operational logs. Discord usernames and avatars may be displayed in quote attribution and review notifications.</li>
        <li><strong>Subscriptions:</strong> Discord provides entitlement information, including product and server identifiers and entitlement status, so we can enable Premium. Payment card details are handled by Discord and its payment providers; the bot does not collect them.</li>
      </ul>
      <p>The bot uses slash commands and does not monitor server conversations or collect message history. Text you submit through a command, including a quote or author name, is processed to carry out that command.</p>

      <h2>How we use and share data</h2>
      <p>We use this information to deliver quotes, save your server settings, review suggestions, enable Premium, respond to support requests, and diagnose service problems. Discord and the infrastructure providers that run the service process information needed to provide those functions.</p>
      <p>Suggestions are sent to the FluffBoost team's review channel with the submitter's Discord profile information. Review results may be posted there and sent to the submitter by direct message. Approved quote text, author attribution, and submitter profile attribution can appear in any server using FluffBoost. Do not submit private or sensitive information.</p>

      <h2>Website and third-party services</h2>
      <p>This website is hosted on GitHub Pages. This website's application code includes no advertising trackers or analytics. A theme preference may be saved in your browser; documentation search uses a static index. Hosting providers may process request information such as IP addresses under their own policies. Links to Discord, GitHub, and our community website take you to services with their own privacy policies.</p>
      <p>See the <a href="https://discord.com/privacy">Discord Privacy Policy</a> and <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">GitHub General Privacy Statement</a>.</p>

      <h2>Retention and deletion</h2>
      <p>Server configuration is stored while the bot serves the server. The bot attempts to delete that configuration when it leaves the server and removes stale server records during startup cleanup. Removing the bot does not automatically delete quote submissions, approved shared quotes, operational logs, or copies of messages already delivered on Discord.</p>
      <p>Quote and review records are retained to operate and moderate the shared library. Logs and any infrastructure backups follow the operator's maintenance practices; this application does not enforce a fixed automatic retention period for those records.</p>
      <p>To request access, correction, or deletion, contact us through the <a href={site.companyUrl}>MrDemonWolf website</a> or our <a href={site.discordUrl}>support Discord</a>. Identify the relevant Discord user or server ID and the records involved. We may need to verify that you control the account or server before acting. Do not send passwords, bot tokens, or payment card details.</p>

      <h2>Policy updates and contact</h2>
      <p>Changes to our service or data practices may lead to updates to this policy. The date above identifies the latest revision. For questions, contact <a href={site.companyUrl}>MrDemonWolf, Inc.</a>.</p>
      <p>Also read the <Link href="/terms">Terms of Service</Link>.</p>
    </LegalPage>
  );
}
