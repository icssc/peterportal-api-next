module.exports = {
  extends: ["@commitlint/config-conventional"],
  ignores: [(msg) => /^chore\(deps\): bump .+ from .+ to .+$/.test(msg)],
};
