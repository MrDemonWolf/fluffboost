import Link from "next/link";
import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Using FluffBoost, contributing quotes, and managing a Premium subscription through Discord.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" description="These terms apply to the hosted FluffBoost Discord bot and this website, operated by MrDemonWolf, Inc. By using the service, you agree to these terms.">
      <h2>Using FluffBoost</h2>
      <p>You must be eligible to use Discord under its <a href="https://discord.com/terms">Terms of Service</a> and comply with its <a href="https://discord.com/guidelines">Community Guidelines</a>. Invite and configure the bot only in servers where you are authorized to do so. Server administrators control the delivery channel and may remove the bot at any time.</p>
      <p>Do not use FluffBoost to harass people, distribute unlawful material, submit private information about others, infringe intellectual property, evade moderation, or disrupt the service. We may reject submissions or restrict access to address abuse and service problems.</p>

      <h2>Quotes and community submissions</h2>
      <p>Submit only content you have the right to share, with accurate author attribution. By submitting a quote, you authorize MrDemonWolf, Inc. to store, review, reproduce, and distribute it with attribution as part of FluffBoost's shared quote library and related review notifications. This permission does not transfer ownership of your content.</p>
      <p>Suggestions are reviewed by the FluffBoost team. Approval is not guaranteed. Approved quotes may be delivered to other servers; the library is shared across the service. Contact us if you believe a quote violates your rights or should be removed.</p>

      <h2>Free features and Premium</h2>
      <p>Free use includes the default daily quote, instant quotes, and community suggestions. Premium currently adds custom delivery time, timezone, and daily, weekly, or monthly frequency for the subscribed server. The <Link href="/docs/premium">Premium guide</Link> explains activation.</p>
      <p>Premium is a recurring Discord App Subscription. Review the product, server, price, billing period, and renewal information in Discord's checkout before purchasing. Discord handles billing and subscription management under its applicable terms, including its <a href="https://discord.com/terms/paid-services-terms">Paid Services Terms</a>. Pricing shown in Discord is authoritative.</p>
      <p>Manage or cancel your subscription in Discord's User Settings under Subscriptions. Cancellation normally takes effect at the end of the current billing period, as described by <a href="https://support.discord.com/hc/en-us/articles/26729692307351-How-to-Cancel-your-Premium-App-Subscription">Discord's cancellation guide</a>. For payment or refund requests, use <a href="https://dis.gd/billing">Discord billing support</a>. For missing bot features, contact our support team. Removing the bot does not by itself cancel a Discord subscription.</p>

      <h2>Availability and limitations</h2>
      <p>FluffBoost depends on Discord and hosting infrastructure. Maintenance, outages, permissions, and network problems can delay or prevent delivery. We do not guarantee uninterrupted service or delivery at an exact moment. Features may change as the project develops; the subscription listing describes the paid offering available at purchase.</p>
      <p>Motivational quotes are general encouragement. They are not medical, mental health, legal, or financial advice. To the extent permitted by applicable law, the service is provided as available without additional warranties. These terms do not limit rights that cannot lawfully be excluded.</p>

      <h2>Privacy, source code, and updates</h2>
      <p>Our <Link href="/privacy">Privacy Policy</Link> explains data processing and deletion requests. The repository's GPL-3.0-only license governs use of the source code; it does not promise hosting or Premium access for independently hosted copies.</p>
      <p>We may update these terms as the service changes. The revision date appears above. If you have questions, contact <a href={site.companyUrl}>MrDemonWolf, Inc.</a> or the <a href={site.discordUrl}>support Discord</a>.</p>
    </LegalPage>
  );
}
