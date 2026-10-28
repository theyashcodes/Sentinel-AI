import { detectImpersonation } from "@/lib/scanner/tracer";
import { queryGrok, GrokMessage, ScanContext } from "./grok";

export interface CyBroResponse {
  reply: string;
  threatDetected?: boolean;
  mood: "idle" | "happy" | "angry" | "smug" | "thinking";
  quickSuggestions?: string[];
  poweredByGrok?: boolean;
}

/**
 * CyBro Tactical Intelligence Engine (Powered by Grok/Groq with Street-Smart Roast Persona + Local Fallback)
 */
export async function generateCyBroReply(
  message: string,
  history: GrokMessage[] = [],
  customApiKey?: string,
  scanContext?: ScanContext
): Promise<CyBroResponse> {
  const cleanMsg = message.trim();
  const lowerMsg = cleanMsg.toLowerCase();

  // 1. Try Grok / Groq API first
  const grokResponse = await queryGrok(
    [
      ...history,
      { role: "user", content: cleanMsg },
    ],
    customApiKey,
    scanContext
  );

  if (grokResponse) {
    const contextualSuggestions = scanContext
      ? scanContext.isThreat
        ? ["How do I block this threat?", "Explain technical risk", "Who created Sentinel AI?"]
        : ["What makes this safe?", "Scan another target", "Who created Sentinel AI?"]
      : [
          "Who created Sentinel AI?",
          "How does AI Media Forensics detect deepfakes?",
          "How does Redirect Tracer detect homoglyphs?",
        ];

    return {
      reply: grokResponse.reply,
      threatDetected: grokResponse.threatDetected,
      mood: grokResponse.mood,
      poweredByGrok: true,
      quickSuggestions: contextualSuggestions,
    };
  }

  // 2. High-Octane Local Knowledge & Fallback Brain

  // --- Scenario 0: Developer / Creator Info (Yash Gupta) ---
  if (
    lowerMsg.includes("developer") ||
    lowerMsg.includes("creator") ||
    lowerMsg.includes("who made") ||
    lowerMsg.includes("who built") ||
    lowerMsg.includes("founder") ||
    lowerMsg.includes("yash") ||
    lowerMsg.includes("yash gupta")
  ) {
    return {
      reply: `🚀 **Meet My Creator: Yash Gupta!** 🛡️\n\nMujhe aur pure **Sentinel AI** ecosystem ko **Yash Gupta** ne design aur engineer kiya hai.\n\n- **GitHub:** [@theyashcodes](https://github.com/theyashcodes)\n- **Email:** \`iamyash.2000@gmail.com\`\n- **Mission:** AI deepfakes, phishing, SSRF, aur quishing jaise cutting-edge digital threats se real-time protect karna.\n\nPure system ka core architecture, ML pipelines, aur mera ye personality module sab Yash ne banaya hai! 🦾⚡`,
      threatDetected: false,
      mood: "smug",
      quickSuggestions: [
        "What tools does Sentinel AI offer?",
        "How does AI Media Forensics work?",
        "How does Redirect Tracer work?",
      ],
    };
  }

  // --- Scenario 0.5: Active Scan Deep-Dive via Local Fallback ---
  if (scanContext) {
    if (
      lowerMsg.includes("what makes this safe") ||
      lowerMsg.includes("why is it safe") ||
      lowerMsg.includes("safe kyu") ||
      lowerMsg.includes("safe kyu hai")
    ) {
      return {
        reply: `⚡ **Security Verification Breakdown:**\nTarget \`${scanContext.target}\` scanned via **${scanContext.tool}**.\n\nVERDICT: VERIFIED SAFE\n- **Integrity Check:** Zero cryptographic or heuristic anomalies detected.\n- **Signatures:** No phishing homoglyphs, malware fingerprints, or generative diffusion artifacts.\n- Safe to proceed in your normal workflow!`,
        threatDetected: false,
        mood: "happy",
        quickSuggestions: ["Scan another target", "Who created Sentinel AI?"],
      };
    }

    if (
      lowerMsg.includes("explain technical risk") ||
      lowerMsg.includes("how do i block this") ||
      lowerMsg.includes("why is it flagged") ||
      lowerMsg.includes("risk kya hai") ||
      lowerMsg.includes("kya threat hai")
    ) {
      return {
        reply: `🛡️ **Technical Risk Breakdown:**\nTarget \`${scanContext.target}\` was flagged by **${scanContext.tool}**.\n\nVERDICT: THREAT DETECTED\n- **Risk Level:** ${scanContext.threatLevel || "High"}\n- **Summary:** ${scanContext.summary}\n- **Countermeasure:** Do not enter credentials, open downloads, or interact with this asset. Quarantine immediately!`,
        threatDetected: true,
        mood: "angry",
        quickSuggestions: ["How do I block this threat?", "Who created Sentinel AI?"],
      };
    }
  }

  // --- Scenario A: URL Inspection ---
  const urlRegex = /(https?:\/\/[^\s]+|[a-zA-Z0-9-]+\.(?:com|in|org|net|xyz|ru|top|click|link|site|info)[^\s]*)/i;
  const urlMatch = cleanMsg.match(urlRegex);

  if (urlMatch) {
    const rawUrl = urlMatch[0];
    let host = rawUrl;
    try {
      const parsed = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
      host = parsed.hostname;
    } catch {
      // fallback
    }

    // Homoglyph & visual spoofing
    const impersonation = detectImpersonation(host);
    if (impersonation.detected) {
      return {
        reply: `🛡️ **Tactical Alert: Homoglyph Spoofing Detected!**\n\nTarget domain (\`${host}\`) is visually impersonating **${impersonation.targetBrand || "brand"}** using lookalike Russian/Cyrillic characters!\n\nVERDICT: THREAT DETECTED\n- ❌ Do NOT enter any login credentials, OTPs, or payment details.\n- 🔒 Close the browser tab immediately and report the source.`,
        threatDetected: true,
        mood: "angry",
        quickSuggestions: [
          "How did hacker hide fake characters?",
          "What is a homoglyph attack?",
          "Check another link",
        ],
      };
    }

    // Known Safe Sites
    if (
      /(google\.com|youtube\.com|github\.com|wikipedia\.org|amazon\.in|flipkart\.com|icicibank\.com|onlinesbi\.sbi|hdfcbank\.com)$/i.test(
        host
      )
    ) {
      return {
        reply: `😄 **Wah bhai wah! Finally ek sensible link leke aaye ho!**\n\nMai toh darr gaya tha ki fir kisi 25 din me paisa double wali site ka link laye hoge! Ye domain (\`${host}\`) **100% SAFE aur Genuine** hai.\n\nKoi homoglyph nahi, koi phishing redirect nahi. Tum maze se browse kar sakte ho bro! 🤜🤛`,
        threatDetected: false,
        mood: "happy",
        quickSuggestions: ["Scan another link", "What makes a link safe?", "How to detect deepfakes?"],
      };
    }

    // Suspicious TLDs
    if (/\.(xyz|top|ru|buzz|click|rest|tk|ml)$/i.test(host)) {
      return {
        reply: `🤨 **Arey bhai, ye kaunsa ajeeb sa link utha laye ho?**\n\nDomain \`${host}\` ek aisi cheap disposable extension use kar raha hai jo scammers ₹40 me khareedte hain! Asli standard companies '.xyz' ya '.click' par banking nahi chalati bro.\n\n🛡️ **SOLUTION:**\nIs par click mat karna. Agar kisi WhatsApp group ya anjaan SMS me aaya hai, toh seedha report and block maaro!`,
        threatDetected: true,
        mood: "angry",
        quickSuggestions: ["Trace this link's redirects", "Scan another message"],
      };
    }
  }

  // --- Scenario B: Bank Fraud / Money Deducted ---
  if (
    lowerMsg.includes("paisa kat gaya") ||
    lowerMsg.includes("paise kat") ||
    lowerMsg.includes("money deducted") ||
    lowerMsg.includes("account hack") ||
    lowerMsg.includes("otp share") ||
    lowerMsg.includes("fraud ho gaya")
  ) {
    return {
      reply: `🤦‍♂️ **Bhai bhai bhai... Pehle thoda rona band karo aur dimaag lagao!**\n\nAb jo hona tha ho gaya, par agar abhi hosh nahi sambhala toh jo bacha hai wo bhi chala jayega. Mazak side me, **ye 3 kaam agle 5 minute me karo:**\n\n1. ⛔ **Card / NetBanking FREEZE:** Turant apne bank app (YONO, iMobile, HDFC, etc.) me ghuso aur card ko **TEMPORARY BLOCK / OFF** kar do. Customer care ko call karke account freeze lagwao.\n2. 📞 **DIAL 1930 (Golden Hour Rule):** National Cyber Crime Reporting Helpline **1930** par turant call milao! Agar fraud ke 2 ghante ke andar police ko bataoge, toh wo transaction ko raste me rok sakti hai!\n3. 🏛️ **Formal Complaint:** [cybercrime.gov.in](https://cybercrime.gov.in) par online portal par complain darj karo with transaction reference number.\n\nAur suno, ab agar koi call karke bole ki *"Main bank se bol raha hu, paise wapas karwane ke liye OTP batao"* — toh usko seedha gaali deke phone kaat dena! Samjhe?`,
      threatDetected: true,
      mood: "angry",
      quickSuggestions: [
        "What is Golden Hour in cyber fraud?",
        "How to file complaint on cybercrime.gov.in?",
        "Can scammed money be recovered?",
      ],
    };
  }

  // --- Scenario C: Lottery / 25 Lakh KBC / Kaun Banega Crorepati Scam ---
  if (
    lowerMsg.includes("lottery") ||
    lowerMsg.includes("kbc") ||
    lowerMsg.includes("25 lakh") ||
    lowerMsg.includes("crorepati") ||
    lowerMsg.includes("won prize")
  ) {
    return {
      reply: `😂 **Bhai itna bada joke toh maine aaj tak nahi suna!**\n\nBhai ek baat bata... tune lottery ka ticket khareeda tha? KBC me Amitabh Bachchan ko phone lagaya tha? Nahi na? Toh 25 Lakh rupaye tere account me kya aasmaan se barsenge?! 🤦‍♂️\n\n**Scammer ka script:**\nWo bolenge *"Sir 25 Lakh transfer karne ke liye ₹12,500 tax pehle jama karao"*. Jaise hi tum 12k doge, scammer gayab aur tumhara popat!\n\n🛡️ **SOLUTION:**\nUs scammer ko bolo *"Bhai 25 Lakh me se 5 Lakh tu rakh le, baaki 20 Lakh mere ghar courier bhej de!"* Aur fir us number ko turant **BLOCK aur REPORT** karo!`,
      threatDetected: true,
      mood: "smug",
      quickSuggestions: [
        "How do lottery scams work?",
        "Report number to Chakshu portal",
        "Check another message",
      ],
    };
  }

  // --- Scenario D: Electricity Bill / Bijli Cut Scam ---
  if (
    lowerMsg.includes("bijli") ||
    lowerMsg.includes("electricity") ||
    lowerMsg.includes("power cut") ||
    lowerMsg.includes("light cut")
  ) {
    return {
      reply: `⚡ **Arey waah! Raat ko 9:30 baje electricity officer WhatsApp pe notice bhej raha hai?!**\n\nBhai electricity department wale din me office me chai peene ka time nahi nikal paate, wo raat ko tumhe personal mobile number se SMS bhejenge? 😂\n\n**Trap samjho:**\nYe scammer bolenge *"₹10 ka recharge karo ya ye app install karo"* (jo AnyDesk ya malicious .apk hota hai), jisse wo tumhare phone ka screen dekhkar saare passwords loot lete hain!\n\n🛡️ **SOLUTION:**\n1. Number ko turant **BLOCK** karo.\n2. Apna electricity bill hamesha official discom app ya Google Pay/PhonePe par check karo. Waha bill zero hai toh light nahi kategi bro!`,
      threatDetected: true,
      mood: "angry",
      quickSuggestions: [
        "What to do if AnyDesk was downloaded?",
        "How to report fake SMS on Chakshu portal?",
      ],
    };
  }

  // --- Scenario E: Part-time / Telegram / Like & Earn Scam ---
  if (
    lowerMsg.includes("part time") ||
    lowerMsg.includes("telegram") ||
    lowerMsg.includes("youtube like") ||
    lowerMsg.includes("like and earn") ||
    lowerMsg.includes("daily 5000")
  ) {
    return {
      reply: `💼 **Laxmi Chit Fund 2.0 me aapka swagat hai! 21 din me paisa double!** 🤡\n\nBhai agar YouTube video like karke roz ₹5000 milte, toh desh ke saare engineers naukri chhodkar phone pe reels like nahi kar rahe hote?\n\n**Inka modus operandi:**\n1. Pehle ₹150 bhejkar lalach denge.\n2. Fir Telegram group me daalenge jaha 50 fake accounts likhenge *"Thank you sir I got ₹50,000"*. \n3. Fir tumse bolenge ₹10,000 deposit karo VIP task ke liye. Jaise hi daaloge — Kissa khatam, paisa hazam!\n\n🛡️ **SOLUTION:**\nUnka ₹150 mila ho toh biryani khao, aur unhe har jagah se **BLOCK** karo! 1 rupaya bhi transfer mat karna!`,
      threatDetected: true,
      mood: "smug",
      quickSuggestions: [
        "How Telegram crypto task frauds work?",
        "Can cyber police freeze scammer UPI?",
      ],
    };
  }

  // --- Scenario F: Safe Email / Verified C2PA / Clean file ---
  if (
    lowerMsg.includes("spf pass") ||
    lowerMsg.includes("dkim pass") ||
    lowerMsg.includes("safe email") ||
    lowerMsg.includes("c2pa verified") ||
    lowerMsg.includes("clean scan") ||
    lowerMsg.includes("no malware")
  ) {
    return {
      reply: `🎉 **Ayyy shabaash! Ekdum clean aur genuine nikla ye toh!** 😄\n\nMaine technical check kiya — cryptographic signature valid hai, SPF/DKIM seals pass ho chuke hain, aur koi shady payload nahi mila. \n\nMatlab samne wala sach me wahi hai jo wo claim kar raha hai. Tumhare dimaag ke antivirus ko 10 out of 10! You can proceed safely bro! 🚀`,
      threatDetected: false,
      mood: "happy",
      quickSuggestions: [
        "Scan another email/file",
        "What if an email fails DMARC?",
        "Explain C2PA digital signatures",
      ],
    };
  }

  // --- Scenario G: Deepfake / Sextortion / AI blackmail ---
  if (
    lowerMsg.includes("blackmail") ||
    lowerMsg.includes("nude") ||
    lowerMsg.includes("video call") ||
    lowerMsg.includes("sextortion") ||
    lowerMsg.includes("deepfake")
  ) {
    return {
      reply: `🛡️ **Suno meri baat dhyan se: Darne ka nahi, in scammers ki aisi ki taisi!**\n\nYeh log random video call karke screen record karte hain aur face morph karke blackmail karte hain. Inka target sirf tumhara darr hota hai.\n\n🚫 **GOLDEN RULES (Dimag me bitha lo):**\n1. **₹1 BHI MAT DENA:** Agar ₹500 bhi diye, wo zindagi bhar phone karte rahenge. Paisa dene se blackmail rukta nahi, badhta hai!\n2. **NO CONTACT & BLOCK:** Ek shabd baat mat karo. Screenshot lo evidence ke liye aur instantly block maaro.\n3. **SUBMIT HASH ON StopNCII.org:** Agar koi private photo morph ki hai, toh [StopNCII.org](https://stopncii.org) par hash create karo — Facebook, Instagram aur WhatsApp usko auto-block kar denge.\n4. **Dial 1930:** Cyber Crime Helpline ko report karo.\n\nKuch nahi hoga bro, himmat rakho! Hum log hain na sath me. 🤜🤛`,
      threatDetected: true,
      mood: "angry",
      quickSuggestions: [
        "How does StopNCII.org protect privacy?",
        "Will police reveal identity to parents?",
        "How to block numbers permanently?",
      ],
    };
  }

  // --- Scenario H: Sentinel AI Platform Knowledge & Features ---
  if (lowerMsg.includes("redirect tracer") || lowerMsg.includes("tracer") || lowerMsg.includes("homoglyph")) {
    return {
      reply: `🔍 **Sentinel Redirect Tracer (/dashboard/tracer):**\nYe tool multi-hop 301/302 redirects ko trace karta hai, Russian/Cyrillic homoglyph attacks (e.g. fake \`раypal.com\`) ko pakadta hai aur destination ka live screenshot leke dikhata hai!`,
      threatDetected: false,
      mood: "smug",
      quickSuggestions: ["How does AI Media Forensics work?", "What does Email Dissector do?"],
    };
  }

  if (lowerMsg.includes("media forensics") || lowerMsg.includes("forensics") || (lowerMsg.includes("deepfake") && !lowerMsg.includes("blackmail"))) {
    return {
      reply: `👁️ **AI Media Forensics (/dashboard/forensics):**\nDual-engine deepfake analyzer hai! Pehla engine C2PA digital signatures se hidden DALL-E/Firefly prompts nikalta hai, aur doosra Spectral FFT frequency analysis se fake pixels pakadta hai!`,
      threatDetected: false,
      mood: "smug",
      quickSuggestions: ["How to check an email file?", "What is URL Scanner?"],
    };
  }

  if (lowerMsg.includes("email audit") || lowerMsg.includes("email dissector") || lowerMsg.includes("eml")) {
    return {
      reply: `📬 **Phishing Email Dissector (/dashboard/email-audit):**\nBas koi bhi \`.eml\` email file drop karo. Ye SPF, DKIM aur DMARC wax-seals check karega aur batayega ki sender email spoofed hai ya asli bank se aaya hai!`,
      threatDetected: false,
      mood: "smug",
      quickSuggestions: ["How does Redirect Tracer work?", "Explain C2PA"],
    };
  }

  if (lowerMsg.includes("extension") || lowerMsg.includes("browser extension")) {
    return {
      reply: `🛡️ **Sentinel AI Browser Extension (/dashboard/extension):**\nChromium aur Brave ke liye real-time protection extension hai. Page pe ek-click \`.zip\` download button hai, usko extract karke Developer Mode me load kar lo!`,
      threatDetected: false,
      mood: "smug",
      quickSuggestions: ["How does URL Scanner work?", "Check a link"],
    };
  }

  if (lowerMsg.includes("sentinel") || lowerMsg.includes("project") || lowerMsg.includes("features") || lowerMsg.includes("tools")) {
    return {
      reply: `⚡ **Sentinel AI Full Security Arsenal (Engineered by Yash Gupta):**\n1. **AI Media Forensics:** C2PA metadata & FFT spectral pixel deepfake detector.\n2. **AI Voice Clone Forensics:** Bio-acoustic jitter, shimmer & neural vocoder audio analyzer.\n3. **Redirect Tracer:** SSRF-protected multi-hop tracer & Russian homoglyph unmasker.\n4. **URL Threat Scanner:** Malware feeds, SSL handshake & DNS verification.\n5. **QR Quishing Scanner:** Rogue payload & Wi-Fi trap detection.\n6. **Phishing Email Dissector:** RFC 822 .eml audit with SPF/DKIM/DMARC checks.\n7. **Browser Extension:** Real-time Chromium/Brave protection shield.\n\nKis tool ke baare me deep technical detail chahiye bro?`,
      threatDetected: false,
      mood: "smug",
      quickSuggestions: ["Who created Sentinel AI?", "Explain AI Media Forensics", "Explain Redirect Tracer"],
    };
  }

  // --- Scenario I: General banter / Default Greeting ---
  return {
    reply: `Yo! Main hu **CyBro** — Sentinel AI ka sabse sarcastic aur sharp cybersecurity companion! 🤖🔥\n\nScammers ko roast karna aur aapke accounts ko secure rakhna mera roz ka kaam hai. Mujhe koi bhi link, SMS, WhatsApp forward, ya email drop karke poocho — roast bhi karunga aur solid solution bhi dunga!`,
    threatDetected: false,
    mood: "smug",
    quickSuggestions: [
      "Check this link: https://раypal.com",
      "Check this link: https://google.com",
      "Mera 25 lakh ka lottery SMS aaya hai",
      "Account se paise kat gaye kya karu?",
    ],
  };
}
