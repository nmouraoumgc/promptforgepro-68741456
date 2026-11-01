-- NOT EXECUTED. Inserts the 37 approved recipients as pending (dedupe: unique campaign+user_id).
-- Re-checks at insert time: still free, no active sub, not unsubscribed, no completed ONEHACK100, email confirmed.
insert into public.campaign_sends (campaign, batch, user_id, email, first_name, status)
select v.campaign, v.batch, p.id, u.email, null, 'pending'
from (values
('ONEHACK_REMIND','failed','bdcf2b88-b222-4c4b-b21d-4bf0814affe8'::uuid),
('ONEHACK_REMIND','main','15f702a6-87cd-44e0-a051-feedb0933a7d'::uuid),
('ONEHACK_REMIND','main','da09172c-2d46-4962-b725-0ebff5cca361'::uuid),
('ONEHACK_REMIND','main','b5bb7f8e-ff82-45ed-8f04-93e80ca79239'::uuid),
('ONEHACK_REMIND','failed','1ab2068d-98c9-465c-8b7e-f87ffef4a8ba'::uuid),
('ONEHACK_REMIND','main','eea42d0b-70ea-41fa-aec9-bc41485319f6'::uuid),
('ONEHACK_REMIND','main','d0d930d4-a934-4024-b31c-fc3adc350e63'::uuid),
('ONEHACK_REMIND','main','858efc06-80a6-4ae0-8de8-ab69b0dcfe9f'::uuid),
('ONEHACK_REMIND','failed','013567fa-7eca-42ce-ae1f-67ac1535720a'::uuid),
('ONEHACK_REMIND','main','843640f5-d7c5-491e-8436-8824f2df61ea'::uuid),
('ONEHACK_REMIND','main','a6787bcd-03b5-426b-9a6f-84b233bf89f9'::uuid),
('ONEHACK_REMIND','main','50b1d9ad-fa57-46e1-ad61-2664464b954f'::uuid),
('ONEHACK_REMIND','failed','9bf2043b-5013-4b1f-a7ba-dd53d1e15d35'::uuid),
('ONEHACK_REMIND','main','17a5cdfd-823d-4f6c-aa4b-02f6b5778d0f'::uuid),
('ONEHACK_REMIND','main','c284c904-ecca-4f19-b78f-868752d0bb23'::uuid),
('ONEHACK_REMIND','main','2016812e-9957-4a83-806c-58bd581a3a9d'::uuid),
('ONEHACK_REMIND','main','c75c5210-1d1c-4576-8a56-85eadced37cd'::uuid),
('ONEHACK_REMIND','failed','39986cf5-ad78-4f02-a1ad-6680081f5c34'::uuid),
('ONEHACK_REMIND','main','87dc1718-83a8-4318-bc11-3690caa69abe'::uuid),
('ONEHACK_REMIND','main','f49268e2-b48c-4ba5-bed2-125f26402d6b'::uuid),
('ONEHACK_REMIND','main','84bf23d9-69d8-4cba-801b-2aaed9b42ae3'::uuid),
('ONEHACK_REMIND','main','457da860-09b0-43d9-819f-2f8eee1d9d7a'::uuid),
('ONEHACK_REMIND','main','e9bf0cc9-53c4-4469-995b-fc36c104fbb6'::uuid),
('ONEHACK_REMIND','main','04e792ad-1923-41b6-8474-81d78090439d'::uuid),
('ONEHACK_REMIND','failed','afd2bc05-caa5-4c95-85e4-516905efa6b4'::uuid),
('ONEHACK_REMIND','failed','96528370-70d1-4139-bf95-a1ab681123d0'::uuid),
('ONEHACK_REMIND','failed','7a35be90-4f9d-4a01-af05-a6074731a2ae'::uuid),
('ONEHACK_REMIND','main','c27a0b91-6072-4d89-a2a2-ef3c32858bc8'::uuid),
('ONEHACK_REMIND','failed','3a6c4832-231c-468b-8a84-2622e1736cfb'::uuid),
('ONEHACK_REMIND','failed','db555345-bfd6-415a-a8b1-c06ddc47b6ce'::uuid),
('ONEHACK_REMIND','main','00bb8405-577a-4c9a-8250-cf37a248bc70'::uuid),
('ONEHACK_REMIND','main','d9df9bcb-7730-4d1a-b403-de16ca4da31d'::uuid),
('ONEHACK_REMIND','main','f376bf88-9434-4ba1-bfc6-0bbca8b0b3ee'::uuid),
('ONEHACK_REMIND','main','6ad1d33c-1a82-41ed-96cc-d997e102bdde'::uuid),
('ONEHACK_REMIND','main','6cede9b4-a40f-4c8b-a98a-5d40cd095772'::uuid),
('ONEHACK_REMIND','main','b29a5ef7-3977-43b5-a9fb-670b93a8a7de'::uuid),
('ONEHACK_REMIND','main','408a907e-99fa-4436-a0a4-47a258b3641f'::uuid)
) v(campaign,batch,uid)
join public.profiles p on p.id=v.uid join auth.users u on u.id=v.uid
where p.current_plan::text='free' and u.email_confirmed_at is not null
  and not exists(select 1 from public.subscriptions s where s.user_id=p.id and s.status in ('active','trialing','past_due'))
  and not exists(select 1 from public.email_preferences e where e.user_id=p.id and e.marketing_unsubscribed)
  and not exists(select 1 from public.checkout_attempts a where a.user_id=p.id and a.discount_code='ONEHACK100' and a.status='completed')
on conflict (campaign, user_id) do nothing;
