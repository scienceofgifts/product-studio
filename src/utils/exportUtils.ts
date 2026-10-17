/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChatGPTWritingBrief, ProductRecord } from '../types';

/**
 * Converts a ChatGPTWritingBrief into a concise, authoritative writing prompt for ChatGPT (Sections A through G).
 */
export function formatWritingBriefMarkdown(brief: ChatGPTWritingBrief): string {
  return `# EDITORIAL WRITING BRIEF: ${brief.productIdentity?.workingTitle || 'Product Entry'}
**Science of Gifts — Editorial Intelligence Studio**
*Generated: ${brief.generatedDate ? new Date(brief.generatedDate).toLocaleDateString() : 'N/A'}*

---

### A. WRITING TASK
You are writing a dedicated gift-guide product entry for Science of Gifts.
- **Guide Name:** ${brief.guideContext?.guideName || 'General Guide'}
- **Guide Purpose:** ${brief.guideContext?.guidePurpose || 'Editorial curation'}
- **Deliverable:** Return only the requested finished product entry text adhering to the word-count range and editorial standards below, without analysis, checklist, or commentary.

### B. PRODUCT IDENTITY & VERIFIED FACTS
- **Working Product Name:** ${brief.productIdentity?.workingTitle || 'Untitled'}
- **Product Type:** ${brief.productIdentity?.productType || 'Unspecified'}
- **Canonical Verified Specifications:**
${brief.confirmedSpecifications && brief.confirmedSpecifications.length > 0 
  ? brief.confirmedSpecifications.map((s) => `  - ${s}`).join('\n')
  : `  - ${brief.productIdentity?.suppliedSpecifications || 'None supplied'}`}

### C. INTENDED RECIPIENT & GIFT-GUIDE CONTEXT
- **Primary Recipient:** ${brief.recipientProfile?.primaryRecipient || 'Specialist enthusiast'}
- **Knowledge Depth:** ${brief.recipientProfile?.knowledgeDepth || 'High interest'}
- **Gift Buyer's Motivation:** ${brief.recipientProfile?.buyerMotivation || 'Express understanding of passion'}

### D. RECOMMENDED EDITORIAL ANGLE & DESIGN DETAILS
- **Recommended Angle:** **${brief.editorialAngle?.recommendedAngle || 'Default Angle'}**
- **Strategic Rationale:** ${brief.editorialAngle?.strategicRationale || 'N/A'}
- **Core Goal of the Entry:** ${brief.editorialAngle?.coreGoalOfEntry || 'N/A'}
- **Distinctive Inclusion Reason:** ${brief.editorialAngle?.distinctiveInclusionReason || 'N/A'}
- **Key Design Details to Emphasize:**
${brief.designDetailsToEmphasize?.map((item) => `  - **${item.detail}** (${item.relationshipToRecipient})`).join('\n') || '  - None noted'}

### E. WRITING GUIDELINES & STANDARDS
- **Target Length:** 210 words.
- **Permitted Range:** 180–240 words.
- **Structure:** Two or three paragraphs.
- **Opening:** Open with the most distinctive, supportable observation about the product.
- **Editorial Development:** Interpret the actual design rather than merely listing visual elements. Explain why the distinctive details work together and why they may appeal to the intended recipient.
- **Specifications:** Integrate relevant verified specifications naturally.
- **Audience & Tone:** Write for the gift buyer while respecting the recipient's interests using perceptive, knowledgeable, human-sounding editorial prose.
- **Prohibitions:** Avoid generic promotional language, empty praise, keyword stuffing, repetitive conclusions, and invented lifestyle scenarios. Never invent product features, material properties, performance benefits, historical provenance, or recipient experiences.
- **Em Dashes:** Do not use em dashes.

### F. FACTUAL BOUNDARIES
- **Claims & Assumptions to AVOID:**
${brief.claimsAndAssumptionsToAvoid?.map((c) => `  - ❌ ${c}`).join('\n') || '  - Avoid generic praise and false claims.'}
- **Missing Information — DO NOT INVENT:**
${brief.missingInformationDoNotInvent?.map((m) => `  - ⚠️ ${m}`).join('\n') || '  - Do not invent materials or historical provenance.'}
- **Facts Requiring Verification:**
${brief.factsRequiringVerification?.map((f) => `  - 🔍 ${f}`).join('\n') || '  - None'}

### G. FINAL OUTPUT CONTRACT
Return the finished product entry strictly within the 180–240 word range. 
- Do NOT include any demonstration copy, planning notes, quality scores, self-evaluation, headings, metadata, or introductory/concluding commentary.
- Return only the finished prose paragraphs.
`;
}

/**
 * Downloads arbitrary string content as a local file.
 */
export function downloadFile(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads a CSV catalogue index from a list of ProductRecords.
 */
export function exportCatalogueToCSV(records: ProductRecord[]): void {
  const headers = [
    'ID',
    'Working Name',
    'Product Type',
    'Gift Guide',
    'Primary Recipient',
    'Audience Niche',
    'Recommended Title',
    'Status',
    'Created At',
    'Last Modified'
  ];

  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = records.map((r) => [
    r.id,
    r.details.workingName || 'Untitled',
    r.details.productType,
    r.details.giftGuideName || 'None',
    r.details.primaryRecipient || 'Unspecified',
    r.details.audienceInterest || 'Unspecified',
    r.analysisResult?.titleLaboratory?.recommendedTitle || 'N/A',
    r.status,
    new Date(r.createdAt).toLocaleDateString(),
    new Date(r.updatedAt).toLocaleDateString()
  ]);

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map((row) => row.map(escapeCSV).join(','))
  ].join('\n');

  downloadFile(csvContent, `science_of_gifts_catalogue_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
}
