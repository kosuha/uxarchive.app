-- Function to increment repository view count safely
create or replace function public.increment_repository_view_count(p_repository_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.repositories
  set view_count = view_count + 1
  where id = p_repository_id;
end;
$$;
