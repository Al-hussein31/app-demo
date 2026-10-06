// The facts the proposal assistant is allowed to use. Keep this in sync with
// index.html. If a fact is not here, the bot must not invent it.
export const KNOWLEDGE = `
PROPOSAL: TTC Delivery Platform, prepared for The Triple-Core (TTC) by Hussein Yahaya, Forge Growth. Date: October 2026.
TTC's owners: Farouk, Imran and Haiba. The proposal is addressed to them.

WHAT TTC IS BUILDING (our understanding)
- TTC is based in Abuja (FCT) and launches in Abuja: Wuse, Maitama, Garki, Asokoro, Jabi, Utako, Gwarinpa, Kubwa, Lugbe and surrounding districts.
- A delivery network, mainly for businesses: restaurants, pharmacies, small businesses (SMEs) and vendors enter what they want delivered and TTC connects a motorcycle rider to deliver it, like Uber for packages. Individuals can also send packages.
- Three sides: senders (businesses and customers), riders, and TTC operations.
- Because businesses are the core, the Business Portal is part of the first build, not a later phase.

THE HEADLINE OFFER
- Kick-off within 5 days of TTC saying yes.
- The first 2 weeks of work are free. Real work, not a sample.
- Working platform in 6 weeks in total (the 2 free weeks count inside the 6 weeks).
- The code belongs to TTC from day one, in a code repository in TTC's name.
- If a milestone is late because of Forge Growth, that milestone's payment is refunded.

WHAT IS BUILT (included in both plans)
1. Customer app (Android and iOS): send a package, live map tracking, pay, history, digital receipts, rating, contact support.
2. Business portal (web, and business accounts in the app): restaurants, pharmacies and vendors request deliveries, save pickup addresses, send several deliveries at once, see history, download monthly statements and invoices.
3. Rider app (Android and iOS): registration with ID, photo, licence and motorcycle documents; AI-assisted document checks; TTC approves or rejects; online/offline; available jobs; accept; navigation via Google Maps; confirm pickup; confirm delivery with a code; earnings.
4. Admin dashboard (web): live operations, rider approvals, businesses, customers, pricing rules, payment confirmation, revenue summary.
5. Live map tracking: customers and businesses watch the rider in real time and can share a tracking link.
6. Paystack payments: card and bank transfer in the app, plus cash on delivery confirmed in the dashboard.
7. Automatic distance-based pricing: TTC sets base fare, price per km, minimum fare and size rules in the dashboard; quotes are calculated automatically.
8. AI agent: customers and businesses can book by chat or voice ("pick up from my shop in Wuse 2 and deliver to Gwarinpa"); AI support answers common questions; admin assistant answers questions like "which riders are free in Garki?". Normal tap-to-book always works too; AI is optional for users.
9. Launch: push notifications, Google Play and Apple App Store submission, fixing issues raised by store review, privacy policy and store data-safety setup, handover guide and admin training.

TECHNOLOGY
- Mobile apps: React Native (one codebase for Android and iOS). Forge Growth has built and shipped mobile and desktop apps, including to the Google Play Store.
- Backend: Node.js with TypeScript, PostgreSQL database, real-time updates for live tracking.
- Web: business portal and admin dashboard in React.
- Maps: Google Maps. Payments: Paystack. AI: Google Gemini. Notifications: Firebase push.
- Security: role-based access, encrypted passwords, private storage for rider documents, protected APIs, daily database backups.
- Hosting is set up in TTC's own cloud account.

TIMELINE (6 weeks)
- Day 0: TTC says yes. Within 5 days: kick-off.
- Weeks 1–2 (FREE): backend, accounts and login, customer "send a package" flow, automatic pricing, admin pricing screen. TTC gets a working test app on their own phones (Android test build and iPhone TestFlight).
- End of week 2: TTC decides. Continue (first payment) or walk away and keep all the code. No payment and no hard feelings.
- Weeks 3–4: rider app and verification, live tracking, Paystack payments, business portal.
- Week 5: admin dashboard, AI agent, notifications. Full test builds on TTC's phones (milestone 2).
- Week 6: testing on real and lower-spec phones, fixes, store submission, handover and training (milestone 3).
- Apple and Google review times are outside anyone's control; the 6-week promise is that all apps are working and in TTC's hands for testing, with store submission done.

PLANS AND PRICES (Nigerian Naira)
- Build plan: ₦3,500,000. Everything in "What is built", plus 60 days of bug-fix support after launch.
- Build + Year plan: ₦5,000,000 (recommended). Everything in the Build plan, plus 12 months with Forge Growth starting at launch:
  - WhatsApp ordering bot (businesses and customers book a rider by WhatsApp)
  - ChatGPT app (book and track TTC deliveries from inside ChatGPT)
  - Analytics dashboard (deliveries per day and per rider, times, distances, customer retention, revenue per customer)
  - Scheduled deliveries
  - Automated rider payouts and company-share calculation
  - Refunds module
  - Shopify and WooCommerce plug-ins so online vendors can request TTC riders automatically
  - 12 months of support, bug fixes, monitoring, Android/iOS and store-policy updates, and a monthly check-in
  - Year-plan features are delivered on an agreed roadmap during the year. Brand-new features outside this list are quoted separately.
  - If Forge Growth ever stops supporting TTC during the year, unused months are refunded (₦125,000 per month).

PAYMENT SCHEDULE (no payment before TTC has seen working software)
- Weeks 1–2 free trial: ₦0 on both plans.
- When TTC chooses to continue after the trial: Build ₦1,400,000 (40%) / Build + Year ₦2,000,000 (40%).
- When all apps are on TTC's phones for testing (week 5): Build ₦1,050,000 (30%) / Build + Year ₦1,500,000 (30%).
- At launch and handover (week 6): Build ₦1,050,000 (30%) / Build + Year ₦1,500,000 (30%). The year starts at launch.

GUARANTEES
- 2 weeks free: if TTC doesn't want to continue, they keep all the code and owe nothing.
- On time or money back: if a milestone is late because of Forge Growth, that milestone's payment is refunded. The clock pauses for delays outside Forge Growth's control (waiting for TTC feedback, logo/content, Apple/Google account or Paystack business verification, store review).
- Code ownership: code, app store listings, cloud and Paystack accounts are in TTC's name from day one.
- Year plan: unused months refunded if Forge Growth stops supporting.

FREE EXTRAS (both plans)
- This live interactive demo and proposal.
- A motion-graphics launch film TTC can post on social media at launch. It is already made: a 50-second film with an original Afro-house soundtrack and sound design, on the proposal page (section 02). It will be updated with the final app screens before launch.
- A draft TTC logo and brand colours (TTC can use it or replace it).
- Play Store and App Store listing graphics and text.

NOT INCLUDED / PAID DIRECTLY BY TTC
- Apple Developer Program ($99 per year) and Google Play Console ($25 one time), registered in TTC's name.
- Running costs paid directly to providers: hosting, domain, Google Maps usage, SMS/OTP messages, AI usage beyond free tiers, Paystack transaction fees. Forge Growth gives TTC a monthly cost estimate in week 1 and sets things up to stay on free or low tiers at launch where possible.
- Features outside the agreed list are quoted separately; new requests during the build go onto the roadmap so the launch date stays protected.

WHAT TTC PROVIDES
- Feedback within 2 business days at each review.
- Apple and Google developer accounts and a Paystack business account in TTC's name.
- Business details for store listings, terms and privacy-policy text (Forge Growth can provide a starting template).
- Delivery pricing rules (base fare, per km, minimum).
- Designs: if TTC's designer has designs, Forge Growth builds them as supplied. If some screens aren't ready, Forge Growth's senior frontend engineer designs them in TTC's style so the build isn't held up. The demo is a prototype to show the experience; the final look follows TTC's approved designs.

ABOUT FORGE GROWTH
- Company: Forge Growth Digital Limited (RC 9437238), Nigeria. Builds AI and WhatsApp automation systems; trusted by 100+ Nigerian businesses.
- Team of 4: Hussein Yahaya (Founder & Lead Engineer, single point of contact, full-stack TypeScript engineer), Muhammad Mustapha (Senior Developer, React Native apps), Salman Sanusi (Senior Frontend Engineer, business portal, admin dashboard and screen design), Umar Farouk (Backend Engineer, API, database, tracking, payments, security).
- Projects: Forge Growth (WhatsApp growth systems with AI replies and automatic follow-ups for Nigerian businesses), Surefire Bookings (UK event management and ticketing platform), Artisans Manager (two-sided marketplace connecting local clients with skilled tradespeople through transparent bidding, no lead fees for professionals), Meshgryd Systems (custom platforms, AI-driven workflow automation and connected IoT infrastructure).
- Hussein's portfolio: https://hussein.forgegrowth.ng/ (full-stack developer and founder; works in TypeScript daily across architecture, client systems and business strategy, and uses Go for systems work).
- Client testimonial: Kemi Sarah of Sarah Legal Consult: "The work was smooth. It really saved my time, and it was a good job delivery." (video on the proposal page).
- If Hussein is unavailable, the team continues; the code is documented and lives in TTC's repository, so TTC is never locked in.

DEMO PRICING (illustrative only, TTC sets real prices; the demo uses Abuja districts): base fare ₦800 + ₦180 per km, minimum ₦1,500; medium package +15%, large +35%; express +30%.

CONTACT: Hussein, Forge Growth. WhatsApp/phone +234 704 503 3664, email info@forgegrowth.ng.
`;
