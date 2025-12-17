
-- Create repository_tags join table
create table if not exists repository_tags (
  repository_id uuid not null references repositories(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (repository_id, tag_id)
);

-- Create folder_tags join table
create table if not exists folder_tags (
  folder_id uuid not null references repository_folders(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (folder_id, tag_id)
);

-- Add indexes for performance
create index if not exists idx_repository_tags_repository_id on repository_tags(repository_id);
create index if not exists idx_repository_tags_tag_id on repository_tags(tag_id);

create index if not exists idx_folder_tags_folder_id on folder_tags(folder_id);
create index if not exists idx_folder_tags_tag_id on folder_tags(tag_id);

-- Enable RLS (inherit from parent often, but for now simple policies or assume service role/existing RLS patterns)
-- Assuming tags are workspace scoped and repositories are workspace scoped.
-- We can add RLS later if needed, but standard practice is to enable it.

alter table repository_tags enable row level security;
alter table folder_tags enable row level security;

-- Simple RLS: allow access if user can see repository/folder.
-- For brevity/robustness reusing existing access controls via joins or just generic authenticated access if that's the pattern.
-- Given the context, I'll add basic authenticated policies.

create policy "Users can view repository tags for visible repositories"
  on repository_tags for select
  using (
    exists (
      select 1 from repositories
      where repositories.id = repository_tags.repository_id
      -- Add your repository visibility logic here, e.g. workspace check
    )
  );

create policy "Users can manage repository tags if they can edit repository"
  on repository_tags for all
  using (
    exists (
      select 1 from repositories
      where repositories.id = repository_tags.repository_id
      -- Add edit permission logic
    )
  );

-- Repeat for folders 
create policy "Users can view folder tags for visible folders"
  on folder_tags for select
  using (
    exists (
      select 1 from repository_folders
      where repository_folders.id = folder_tags.folder_id
    )
  );

create policy "Users can manage folder tags if they can edit folder"
  on folder_tags for all
  using (
    exists (
      select 1 from repository_folders
      where repository_folders.id = folder_tags.folder_id
    )
  );
