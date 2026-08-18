# Source Terms-of-Use Check (Task 0 gate)

Scope: verify whether data from the x402 discovery/Bazaar API may be reused and
redistributed as a machine-readable catalog (agentmenu's core function), per
spec §8 and plan Task 0. Sources checked are exactly the three the plan lists.
This note records findings only; the OK/restricted call is made by the
designer gate, not here.

## 1. `https://x402.gitbook.io/x402/core-concepts/bazaar-discovery-layer`

**Status: 未確認 (unconfirmed) — could not retrieve.**

Attempts:
- Direct fetch of the URL as given: returned an HTTP 404 / "page does not
  exist" response from the fetch tool, three separate times (including with
  different extraction prompts).
- Fallback via the site's `llms-full.txt` (`https://x402.gitbook.io/x402/llms-full.txt`),
  searching for "Bazaar" or "Discovery Layer": the only match found was, quoted
  verbatim, a roadmap bullet in the FAQ/Governance section:

  > "Major themes: Multi‑asset support, Additional schemes (`upto`, `stream`, `permit2`), **Discovery layer for service search & reputation**"

  This is a future-roadmap mention, not documentation of current Bazaar terms.
- A web search independently surfaced a page with the title "Bazaar (Discovery
  Layer) | x402" at this exact URL, meaning the page likely exists and is
  indexed, but the fetch tool used here could not retrieve its rendered
  content (probable JS-rendering or bot-protection on gitbook.io).

**Interpretation:** Because the primary text could not be read, no claim about
reuse/redistribution terms on this specific page can be made. It is not
counted toward the OK verdict.

## 2. `https://docs.cdp.coinbase.com/x402/bazaar`

**Status: partially confirmed.**

Original text (verbatim, from the fetched page, titled "Discover services (Bazaar)"):

> "Bazaar discovery is public. You do not need a CDP API key to use the discovery APIs"

No other sentence on this page states a license, redistribution restriction,
or attribution requirement — the fetch tool was asked twice, with targeted
prompts (once generally, once specifically for "discoverable" and "listing is
free"), and confirmed no such language is present on this page.

**Interpretation:** The discovery API is explicitly described as public and
open to unauthenticated querying. That supports reading and displaying the
data, but the page itself is silent on redistribution/republishing rights —
absence of a restriction is not the same as an explicit grant, so this alone
is not conclusive.

**Secondary, unverified signal (not from a direct fetch of this URL):** a web
search snippet (aggregated from multiple indexed sources, not confirmed by
directly fetching a specific page here) states: "If you're using the CDP
facilitator, your service is listed once you enable the bazaar extension with
`discoverable: true`. Listing is free..." This implies opt-in listing by the
service owner, which is a meaningful signal for consent-to-be-indexed, but
because it was not independently confirmed by fetching its source page, it is
flagged as **未確認 (secondary/unverified)** and not used as the sole basis
for a conclusion.

## 3. `https://x402.org` and the x402 GitHub repository LICENSE

**Status: confirmed (via two fetches).**

`https://x402.org` (page titled "Home") — verbatim:

> "The protocol is open-source and has been audited for security."

No explicit license text or terms-of-use document is linked from this
landing page itself.

`https://github.com/coinbase/x402/blob/main/LICENSE` — verbatim opening line:

> "Apache License Version 2.0, January 2004 http://www.apache.org/licenses/ TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION"

**Interpretation:** The x402 *protocol/spec repository* is Apache 2.0, as the
plan expected. Apache 2.0 covers the protocol's source code/spec, not the
discovery *data* served by a facilitator at runtime — those are two different
things. This confirms agentmenu is free to build against and describe the
x402 protocol itself, but it does not by itself license the Bazaar dataset.

## Additional note found during investigation

While probing `docs.x402.org/extensions/bazaar` (an alternate/newer doc URL
found via search, not one of the three plan-listed URLs, so treated as
context only and not a scored source) the fetch tool reported this verbatim
sentence:

> "Catalog indexing is a facilitator implementation detail, not something the x402 OSS repo controls."

This is consistent with reading #2/#3 above: the x402 org sets no blanket
data-reuse policy; each facilitator (e.g. Coinbase's CDP) governs its own
Bazaar catalog's terms.

## Conclusion: OK (with a caveat, no restriction found)

No document — confirmed or unconfirmed — states a restriction on reading,
displaying, or republishing the Bazaar discovery data. Source #2 explicitly
calls the discovery API public and key-less; source #3 confirms the x402 org
itself is Apache 2.0/open-source in spirit. No ToS, robots directive, or
license clause found in this check says "do not redistribute" or "internal
use only." The unconfirmed gitbook page (#1) is the one gap: it was not read,
so it cannot be cited as support, but its absence does not itself create a
restriction either — nothing else found contradicts the "public, reusable"
reading. Given that, and given agentmenu never re-hosts payment credentials or
mutates the source data (it only reads price/liveness signals and republishes
derived, normalized fields), the finding is **OK to proceed**, with the
recommendation that a human (Owner/designer) directly re-check the gitbook
Bazaar page in a real browser before the first public deploy, since it could
not be machine-verified here.

## Attribution policy

Per the plan's own design (spec §5 schema, plan Task 0 Step 2), agentmenu will:
- Tag every catalog entry with its origin via a `source` array field, e.g. `source: ["bazaar"]`, in `/catalog.json`.
- Show a human-readable line in the site footer / README: "Data sources: x402 discovery API."
- Never claim ownership of listed services' data — only republish normalized price/liveness fields derived from what the discovery API and 402 responses themselves expose, never inventing values.

## Files changed

- `docs/notes/2026-08-19-source-tos.md` (this file, created)

No other files were created or modified for this task.
