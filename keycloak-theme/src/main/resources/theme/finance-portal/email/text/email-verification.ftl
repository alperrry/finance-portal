<#ftl output_format="plainText">
${msg("emailVerificationIntro", realmName)}

${link}

${msg("emailVerificationExpire", linkExpirationFormatter(linkExpiration))}
${msg("emailVerificationIgnore")}
