// Verified from task history and installed task functions on the reference
// Pulp instance. Exact names allow type and name search to intersect in Pulp
// before pagination. Custom task functions remain searchable under All types.
export const TASK_TYPES = [
  {
    value: "sync",
    label: "Sync",
    names: [
      "pulp_rpm.app.tasks.synchronizing.synchronize",
      "pulp_file.app.tasks.synchronizing.synchronize",
      "pulp_container.app.tasks.synchronize.synchronize",
      "pulp_deb.app.tasks.synchronizing.synchronize",
      "pulp_gem.app.tasks.synchronizing.synchronize",
      "pulp_hugging_face.app.tasks.synchronizing.synchronize",
      "pulp_npm.app.tasks.synchronizing.synchronize",
      "pulp_python.app.tasks.sync.sync",
      "pulp_ansible.app.tasks.collections.sync",
      "pulp_ansible.app.tasks.git.synchronize",
      "pulp_ansible.app.tasks.roles.synchronize",
      "pulpcore.app.tasks.repository.sync",
    ],
  },
  {
    value: "publish",
    label: "Publish",
    names: [
      "pulp_rpm.app.tasks.publishing.publish",
      "pulp_file.app.tasks.publishing.publish",
      "pulp_deb.app.tasks.publishing.publish",
      "pulp_gem.app.tasks.publishing.publish",
      "pulp_hugging_face.app.tasks.publishing.publish",
      "pulp_python.app.tasks.publish.publish",
      "pulpcore.app.tasks.repository.publish",
    ],
  },
  { value: "create", label: "Create", names: ["pulpcore.app.tasks.base.general_create"] },
  {
    value: "update",
    label: "Update",
    names: ["pulpcore.app.tasks.base.ageneral_update"],
  },
  {
    value: "delete",
    label: "Delete",
    names: [
      "pulpcore.app.tasks.base.ageneral_delete",
      "pulpcore.app.tasks.base.general_multi_delete",
    ],
  },
  {
    value: "modify",
    label: "Modify content",
    names: ["pulpcore.app.tasks.repository.add_and_remove"],
  },
  {
    value: "sign",
    label: "Sign",
    names: [
      "pulp_ansible.app.tasks.signature.sign",
      "pulp_rpm.app.tasks.signing.signed_add_and_remove",
    ],
  },
  {
    value: "cleanup",
    label: "Orphan cleanup",
    names: ["pulpcore.app.tasks.orphan.orphan_cleanup"],
  },
  {
    value: "prune",
    label: "Prune packages",
    names: [
      "pulp_rpm.app.tasks.prune.prune_packages",
      "pulp_rpm.app.tasks.prune.prune_repo_packages",
    ],
  },
] as const;
