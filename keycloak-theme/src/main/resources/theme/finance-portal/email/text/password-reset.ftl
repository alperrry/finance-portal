<#ftl output_format="plainText">
${msg("passwordResetIntro", realmName)}

${link}

${msg("passwordResetExpire", linkExpirationFormatter(linkExpiration))}
${msg("passwordResetIgnore")}
