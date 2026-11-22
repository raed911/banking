type Doc = { title: string; updated: string; notice: string; sections: { h: string; p: string }[] };
type Docs = Record<"terms" | "privacy", Doc>;

const fr: Docs = {
  terms: { title: "Conditions d'utilisation", updated: "Dernière mise à jour : novembre 2026", notice: "Modèle à faire valider par un conseiller juridique avant le lancement commercial.", sections: [
    { h: "1. Objet", p: "Les présentes conditions régissent l'utilisation de la plateforme VAYRO, service en ligne permettant aux commerçants de créer et gérer des programmes de fidélité digitaux pour leurs clients." },
    { h: "2. Compte commerçant", p: "Le commerçant fournit des informations exactes et reste responsable de la confidentialité de ses identifiants et des actions réalisées par les membres de son équipe." },
    { h: "3. Abonnement et paiement", p: "L'accès est proposé sous forme d'abonnement par point de vente (mensuel, semestriel ou annuel), après une période d'essai gratuite. Le paiement est effectué auprès de VAYRO ; l'abonnement est activé à réception. Sans renouvellement, l'accès aux fonctions de scan et d'inscription est suspendu à l'échéance." },
    { h: "4. Utilisation acceptable", p: "Le commerçant s'engage à utiliser VAYRO conformément à la loi, à ne pas tenter de contourner les mesures de sécurité et à informer ses clients de l'utilisation de leurs données." },
    { h: "5. Données des clients finaux", p: "Le commerçant est responsable des données de ses clients ; VAYRO les traite pour son compte, uniquement pour fournir le service, et ne les vend jamais." },
    { h: "6. Disponibilité", p: "VAYRO met en œuvre des moyens raisonnables pour assurer la disponibilité et la sécurité du service, sans garantie d'absence totale d'interruption." },
    { h: "7. Résiliation", p: "Le commerçant peut cesser d'utiliser le service à tout moment. VAYRO peut suspendre un compte en cas de non-paiement ou de violation des présentes conditions." },
    { h: "8. Droit applicable", p: "Les présentes conditions sont soumises au droit tunisien." } ] },
  privacy: { title: "Politique de confidentialité", updated: "Dernière mise à jour : novembre 2026", notice: "Modèle à faire valider par un conseiller juridique (loi organique n° 2004-63) avant le lancement commercial.", sections: [
    { h: "Données collectées", p: "Commerçants : nom, email, téléphone, informations du commerce. Clients finaux : prénom, nom (facultatif), téléphone et/ou email, date d'anniversaire (facultative), historique de fidélité." },
    { h: "Finalités", p: "Fournir le programme de fidélité, prévenir la fraude, envoyer les communications acceptées par le client, assurer la facturation et la sécurité du service." },
    { h: "Base légale et consentement", p: "Les offres marketing ne sont envoyées qu'aux clients ayant donné leur accord explicite, révocable à tout moment." },
    { h: "Conservation", p: "Les données sont conservées pendant la durée de la relation, puis supprimées ou anonymisées. Les journaux de sécurité sont conservés pour une durée limitée." },
    { h: "Sécurité", p: "Chiffrement en transit, isolation stricte des données par commerce, contrôle d'accès par rôles, registre des transactions inaltérable, secrets chiffrés." },
    { h: "Hébergement et sous-traitants", p: "Les données sont hébergées chez des prestataires reconnus (Supabase, Vercel) dans des centres de données situés dans l'Union européenne." },
    { h: "Vos droits", p: "Vous pouvez demander l'accès, la rectification ou la suppression de vos données en contactant le commerçant ou VAYRO via la page Contact." } ] },
};
const en: Docs = {
  terms: { title: "Terms of service", updated: "Last updated: November 2026", notice: "Template to be reviewed by legal counsel before commercial launch.", sections: [
    { h: "1. Purpose", p: "These terms govern the use of VAYRO, an online service that lets businesses create and run digital loyalty programs for their customers." },
    { h: "2. Merchant account", p: "Merchants provide accurate information and are responsible for their credentials and for actions taken by their team members." },
    { h: "3. Subscription and payment", p: "Access is sold as a per-location subscription (monthly, 6-month or annual) after a free trial. Payment is made to VAYRO and the subscription is activated on receipt. Without renewal, scanning and sign-up features are suspended at the end of the period." },
    { h: "4. Acceptable use", p: "Merchants agree to use VAYRO lawfully, not to circumvent security measures, and to inform their customers about how their data is used." },
    { h: "5. End-customer data", p: "Merchants control their customers' data; VAYRO processes it on their behalf only to provide the service and never sells it." },
    { h: "6. Availability", p: "VAYRO uses reasonable efforts to keep the service available and secure, without guaranteeing uninterrupted operation." },
    { h: "7. Termination", p: "Merchants may stop using the service at any time. VAYRO may suspend accounts for non-payment or breach of these terms." },
    { h: "8. Governing law", p: "These terms are governed by Tunisian law." } ] },
  privacy: { title: "Privacy policy", updated: "Last updated: November 2026", notice: "Template to be reviewed by legal counsel before commercial launch.", sections: [
    { h: "Data collected", p: "Merchants: name, email, phone, business details. End customers: first name, last name (optional), phone and/or email, birthday (optional), loyalty history." },
    { h: "Purposes", p: "Providing the loyalty program, preventing fraud, sending communications the customer agreed to, billing and service security." },
    { h: "Consent", p: "Marketing offers are only sent to customers who gave explicit consent, which they can withdraw at any time." },
    { h: "Retention", p: "Data is kept for the duration of the relationship, then deleted or anonymized. Security logs are kept for a limited time." },
    { h: "Security", p: "Encryption in transit, strict per-business data isolation, role-based access control, immutable transaction ledger, encrypted secrets." },
    { h: "Hosting and processors", p: "Data is hosted by established providers (Supabase, Vercel) in data centers located in the European Union." },
    { h: "Your rights", p: "You can request access, correction or deletion of your data by contacting the business or VAYRO through the Contact page." } ] },
};
const ar: Docs = {
  terms: { title: "شروط الاستخدام", updated: "آخر تحديث: نوفمبر 2026", notice: "نموذج يجب مراجعته من مستشار قانوني قبل الإطلاق التجاري.", sections: [
    { h: "1. الموضوع", p: "تنظم هذه الشروط استخدام منصة VAYRO، وهي خدمة إلكترونية تتيح للتجار إنشاء وإدارة برامج ولاء رقمية لعملائهم." },
    { h: "2. حساب التاجر", p: "يقدّم التاجر معلومات صحيحة ويتحمّل مسؤولية سرية بيانات الدخول والعمليات التي يقوم بها أعضاء فريقه." },
    { h: "3. الاشتراك والدفع", p: "يُقدَّم الوصول كاشتراك لكل نقطة بيع (شهري أو نصف سنوي أو سنوي) بعد فترة تجربة مجانية. يتم الدفع لـ VAYRO ويُفعَّل الاشتراك عند الاستلام. عند عدم التجديد تُعلَّق خاصيتا المسح والتسجيل في نهاية المدة." },
    { h: "4. الاستخدام المقبول", p: "يلتزم التاجر باستخدام VAYRO وفق القانون وعدم محاولة تجاوز إجراءات الأمان وإعلام عملائه باستخدام بياناتهم." },
    { h: "5. بيانات العملاء", p: "التاجر مسؤول عن بيانات عملائه، وتعالجها VAYRO نيابة عنه فقط لتقديم الخدمة ولا تبيعها أبدًا." },
    { h: "6. التوفر", p: "تبذل VAYRO جهودًا معقولة لضمان توفر الخدمة وأمانها دون ضمان عدم الانقطاع التام." },
    { h: "7. الإنهاء", p: "يمكن للتاجر التوقف عن استخدام الخدمة في أي وقت، ويمكن لـ VAYRO تعليق حساب عند عدم الدفع أو مخالفة هذه الشروط." },
    { h: "8. القانون المطبق", p: "تخضع هذه الشروط للقانون التونسي." } ] },
  privacy: { title: "سياسة الخصوصية", updated: "آخر تحديث: نوفمبر 2026", notice: "نموذج يجب مراجعته من مستشار قانوني قبل الإطلاق التجاري.", sections: [
    { h: "البيانات المجمّعة", p: "التجار: الاسم والبريد والهاتف ومعلومات المحل. العملاء: الاسم، اللقب (اختياري)، الهاتف و/أو البريد، تاريخ الميلاد (اختياري)، سجل الولاء." },
    { h: "الأغراض", p: "تقديم برنامج الولاء، منع الاحتيال، إرسال الرسائل التي وافق عليها العميل، الفوترة وأمان الخدمة." },
    { h: "الموافقة", p: "لا تُرسَل العروض التسويقية إلا للعملاء الذين وافقوا صراحة، ويمكنهم سحب موافقتهم في أي وقت." },
    { h: "مدة الحفظ", p: "تُحفظ البيانات طوال مدة العلاقة ثم تُحذف أو تُجهَّل. تُحفظ سجلات الأمان لمدة محدودة." },
    { h: "الأمان", p: "تشفير أثناء النقل، عزل صارم لبيانات كل محل، صلاحيات حسب الأدوار، سجل معاملات غير قابل للتعديل، أسرار مشفّرة." },
    { h: "الاستضافة", p: "تُستضاف البيانات لدى مزوّدين معروفين (Supabase و Vercel) في مراكز بيانات داخل الاتحاد الأوروبي." },
    { h: "حقوقك", p: "يمكنك طلب الاطلاع على بياناتك أو تصحيحها أو حذفها عبر التاجر أو عبر صفحة الاتصال في VAYRO." } ] },
};

export const LEGAL = { fr, en, ar } as const;
