-- OneHack post relaunched with ONEHACK100 (100% off first month of Pro monthly, 50 uses, expires 2026-11-28 13:00 UTC).
-- ONEHACK50 (dsc_01m6123494jym3885b5svdja7y) archived in Paddle.
update public.campaign_channels
   set discount_code = 'ONEHACK100',
       note = 'onehack.st forum post, 100% off first month of Pro monthly (50 codes, expires 2026-11-28 13:00 UTC); replaced ONEHACK50 (archived 2026-10-29)'
 where code = 'ONEHACK';
