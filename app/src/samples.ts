// The delayed-order scenario: a customer-service analyst investigates order SO-48213, which is late, and prepares a
// reply. The sample questions run from the end-to-end case, which uses all four IQs, to one question per IQ, so
// "Ask both" shows what each one adds, and end with approved guidance beside public context. The scenario is set on
// Thursday 19 November 2026.
export interface Sample {
  question: string
  // Shown next to a sample that needs an IQ a deployment may leave off.
  note?: string
}

export const CASE_BRIEF = 'You are a customer-service analyst at Contoso on Thursday 19 November 2026. Fabrikam Retail '
  + 'has asked why its order SO-48213 is late. Find out why, check what the policy lets you offer, and prepare a '
  + 'reply that a person on the team reviews and sends.'

export const SAMPLES: readonly Sample[] = [
  {
    question: 'Order SO-48213 is late. Why, and when will it arrive? What may we offer under our policy? Add public context on customs holds, then draft a reply to the customer.',
    note: 'best with Work IQ',
  },
  { question: 'Why is order SO-48213 late, and when will it arrive?' },
  { question: 'Which orders are delayed, how many business days late is each, and is each expected delivery date current?' },
  { question: 'What may we offer a Gold customer whose order is three or more business days late, and who must approve it?' },
  { question: 'How is an order\'s delay calculated, who owns the carrier\'s expected delivery date, and when is it stale?' },
  { question: 'What commonly causes import customs holds, and how long does clearance usually take?' },
  { question: 'Find recent mail about SO-48213', note: 'needs Work IQ' },
  { question: 'How do we handle a customs hold under our internal guidance, and what may we tell the customer? Add public context on common causes and typical clearance times.' },
]
