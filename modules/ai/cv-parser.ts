import Anthropic from '@anthropic-ai/sdk';
import { requireEnv } from '@/lib/env';

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: requireEnv('ANTHROPIC_API_KEY') });
  return _client;
}

const SYSTEM = `You extract structured profile information from a student's CV / resume PDF.

Return ONLY valid JSON in this exact shape (no preamble, no explanation):
{
  "firstName": string | null,
  "lastName": string | null,
  "university": string | null,
  "fieldOfStudy": string | null,
  "yearOfStudy": "L1" | "L2" | "L3" | "M1" | "M2" | "Eng1" | "Eng2" | "Eng3" | "PhD" | null,
  "city": string | null,
  "skills": string[],
  "languages": string[],
  "portfolioLinks": Array<{ "platform": string, "url": string }>,
  "preferredLanguage": "fr" | "en" | null,
  "notes": string
}

Rules:
- Skills: extract 3-12 concrete technical or domain skills (React, Figma, SEO, Python — not soft skills).
- Languages: human languages spoken (French, English, Arabic).
- portfolioLinks: GitHub, LinkedIn, Behance, Dribbble, personal site URLs. Identify the platform by URL pattern.
- yearOfStudy: map "1ère année license" / "1st year" → L1, "2ème année license" → L2, "Master 1" → M1, "engineering year 2" → Eng2, etc. Null if you can't tell.
- preferredLanguage: infer from the CV's primary language (FR if mostly French, EN if mostly English). Null if mixed.
- notes: 1-sentence summary of the candidate's profile for the supervisor's quick scan.

If a field is genuinely absent or ambiguous, use null (or empty array for lists). Do NOT hallucinate.`;

export type CvParseResult = {
  firstName: string | null;
  lastName: string | null;
  university: string | null;
  fieldOfStudy: string | null;
  yearOfStudy: 'L1' | 'L2' | 'L3' | 'M1' | 'M2' | 'Eng1' | 'Eng2' | 'Eng3' | 'PhD' | null;
  city: string | null;
  skills: string[];
  languages: string[];
  portfolioLinks: Array<{ platform: string; url: string }>;
  preferredLanguage: 'fr' | 'en' | null;
  notes: string;
};

/**
 * Parse a CV PDF into structured profile fields using Claude Sonnet
 * with native document/vision support.
 *
 * Caller is responsible for validating the file (size, MIME). We assume
 * a clean PDF here.
 */
export async function parseCv(pdfBase64: string): Promise<CvParseResult> {
  const res = await client().messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2000,
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfBase64,
            },
          },
          {
            type: 'text',
            text: 'Extract the profile fields from this CV. Return only the JSON object.',
          },
        ],
      },
    ],
  });

  const text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  // Claude sometimes wraps JSON in ```json...``` even when told not to.
  // Extract the JSON between the first { and the last matching }.
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < 0) {
    throw new Error('AI did not return a parseable JSON object');
  }
  return JSON.parse(text.slice(start, end + 1)) as CvParseResult;
}
