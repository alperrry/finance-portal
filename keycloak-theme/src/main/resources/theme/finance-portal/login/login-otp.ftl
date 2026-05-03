<#import "template.ftl" as layout>
<#import "field.ftl" as field>
<#import "buttons.ftl" as buttons>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError("totp"); section>
    <#if section = "header">
        ${msg("doLogIn")}
    <#elseif section = "form">
        <form id="kc-otp-login-form" class="${properties.kcFormClass!}" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post">
            <input id="selectedCredentialId" type="hidden" name="selectedCredentialId" value="${otpLogin.selectedCredentialId!''}">

            <#if otpLogin.userOtpCredentials?size gt 1>
                <div class="${properties.kcFormGroupClass!}">
                    <div class="${properties.kcInputWrapperClass!}">
                        <#list otpLogin.userOtpCredentials as otpCredential>
                            <div id="kc-otp-credential-${otpCredential?index}" class="${properties.kcLoginOTPListClass!}" onclick="toggleOTP(${otpCredential?index}, '${otpCredential.id}')">
                                <span class="${properties.kcLoginOTPListItemHeaderClass!}">
                                    <span class="${properties.kcLoginOTPListItemIconBodyClass!}">
                                        <i class="${properties.kcLoginOTPListItemIconClass!}" aria-hidden="true"></i>
                                    </span>
                                    <span class="${properties.kcLoginOTPListItemTitleClass!}">${otpCredential.userLabel}</span>
                                </span>
                            </div>
                        </#list>
                    </div>
                </div>
            </#if>

            <@field.input name="otp" label=msg("loginOtpOneTime") autocomplete="one-time-code" fieldName="totp" autofocus=true />
            <@buttons.loginButton />
        </form>

        <script>
            <#outputformat "JavaScript">
            function toggleOTP(index, value) {
                document.getElementById("selectedCredentialId").value = value;
                Array.from(document.getElementsByClassName(${properties.kcLoginOTPListSelectedClass!?c})).map((item) => item.classList.remove(${properties.kcLoginOTPListSelectedClass!?c}));
                document.getElementById("kc-otp-credential-" + index).classList.add(${properties.kcLoginOTPListSelectedClass!?c});
            }
            </#outputformat>
        </script>
    </#if>
</@layout.registrationLayout>
