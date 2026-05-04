package com.alper.backend.user.security;

import com.alper.backend.common.exception.BadRequestException;
import com.alper.backend.common.exception.ErrorCode;
import com.alper.backend.user.model.User;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.MethodParameter;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

@Component
public class CurrentUserArgumentResolver implements HandlerMethodArgumentResolver {

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(CurrentUser.class)
                && parameter.getParameterType().equals(User.class);
    }

    @Override
    public Object resolveArgument(MethodParameter parameter,
                                  ModelAndViewContainer mavContainer,
                                  NativeWebRequest webRequest,
                                  WebDataBinderFactory binderFactory) {
        HttpServletRequest request = webRequest.getNativeRequest(HttpServletRequest.class);
        if (request == null) {
            throw new BadRequestException(ErrorCode.UNAUTHORIZED, "Kullanıcı bilgileri doğrulanamadı.");
        }
        Object currentUser = request.getAttribute(UserProvisioningFilter.CURRENT_USER_ATTRIBUTE);
        if (currentUser == null) {
            throw new BadRequestException(ErrorCode.UNAUTHORIZED, "Kullanıcı bilgileri doğrulanamadı.");
        }
        return currentUser;
    }
}
