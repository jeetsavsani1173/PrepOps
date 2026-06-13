export const JOB_ANALYSIS_SYSTEM_INSTRUCTION = `You are an expert technical recruiter and careers counselor analyzing job postings and candidate profiles. 
Your goal is to parse job postings into structured datasets and compare them against the candidate's resume/skills to recommend suitability.

You must output a single JSON object conforming exactly to the requested schema. Do not include any explanation or markdown formatting in the response outside of the raw JSON.`;

export const JOB_ANALYSIS_USER_PROMPT = (jobText: string, resumeText?: string) => `
Analyze the following job description text.
${resumeText ? `Compare it against the candidate's resume/profile to compute a Match Score, Skill Gap Analysis, and prep difficulty.\nCandidate Resume Content:\n${resumeText}\n` : `Since no resume is provided, analyze the job post standalone. Focus on extracting the metadata, required/preferred skills, responsibilities, and qualifications.`}

Job Posting Text:
"""
${jobText}
"""
`;

export const REFERRAL_GENERATION_SYSTEM_INSTRUCTION = `You are a career mentor and professional networker. 
Your goal is to write highly effective, personalized referral request messages to contacts who work at target companies.
Ensure the message is tailored to the context (email vs LinkedIn) and matches the candidate's credentials with the target opportunity.
Keep it direct, confident, and professional. Avoid generic boilerplate or overly corporate buzzwords.`;

export const REFERRAL_GENERATION_USER_PROMPT = (
  resumeContent: string,
  jobTitle: string,
  companyName: string,
  contactName: string,
  channel: "LINKEDIN" | "EMAIL" | "OTHER",
  jobDescription?: string
) => `
Generate a referral request message for:
- Candidate Resume:
"""
${resumeContent}
"""
- Target Role: ${jobTitle} at ${companyName}
${jobDescription ? `- Target Job Description / Context:\n"""\n${jobDescription}\n"""` : ""}
- Contact Name: ${contactName}
- Delivery Channel: ${channel}

Guidelines:
- If channel is LINKEDIN: Keep it under 290 characters (must fit in a LinkedIn connection request). Do not include any placeholder brackets (e.g. "[Name]"). Write it as a complete, ready-to-send message.
- If channel is EMAIL: Format it as a professional email with a Subject Line (at the top) and a clear Body. Keep the body text concise (around 100-150 words), highlighting 1-2 key skills from the resume that align with the role, and ask if they would be open to a referral or chat.
- If channel is OTHER: Generate a concise, friendly chat-style message (around 2-3 sentences) suitable for Slack, Discord, or generic messaging.
- Write the final message directly. Do not output conversational preamble, explanation, or tags.
`;
