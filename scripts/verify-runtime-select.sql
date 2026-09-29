\set ON_ERROR_STOP on

SELECT current_user AS effective_role, count(*) AS visible_users
FROM public."User";
