#!/usr/bin/env node
/**
 * AegisGate — Official Moomoo Agent Hub -> Qoder Cloud Agents (QCA) Skill Packager & Validator
 * Implements Participant Handbook §4.2.1:
 *  - Clones MoomooOpen/moomoo-agent-hub (or uses cached clone in /tmp/opencode/moomoo-agent-hub)
 *  - Packages ONE ZIP PER SKILL into public/qca-skills/<skill-name>.zip
 *  - Ensures top-level folder matches YAML `name` in SKILL.md
 *  - Copies shared reference files and repairs relative links
 *  - Excludes credentials, tokens, .git, .DS_Store, __MACOSX
 *  - Writes a machine-readable validation manifest to public/qca-skills/manifest.json
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const REPO_URL = "https://github.com/MoomooOpen/moomoo-agent-hub.git";
const TMP_ROOT = "/tmp/opencode/moomoo-agent-hub-qca";
const WORK_DIR = "/tmp/opencode/qca-skill-staging";
const OUT_DIR = path.resolve(process.cwd(), "public/qca-skills");

function parseFrontmatter(md) {
  const match = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const yaml = match[1];
  const nameMatch = yaml.match(/^name:\s*["']?([^\r\n"']+)["']?/m);
  let description = "";
  const blockDesc = yaml.match(
    /^description:\s*[>|]-?\s*\r?\n((?:[ \t]+[^\r\n]+\r?\n?)+)/m
  );
  if (blockDesc) {
    description = blockDesc[1]
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .join(" ");
  } else {
    const inlineDesc = yaml.match(/^description:\s*["']?([^\r\n"']+)["']?/m);
    if (inlineDesc) description = inlineDesc[1].trim();
  }
  const verMatch = yaml.match(/version:\s*["']?([^\r\n"']+)["']?/m);
  return {
    name: nameMatch ? nameMatch[1].trim() : null,
    description,
    version: verMatch ? verMatch[1].trim() : "1.0.0",
  };
}

function findSkillDirs(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (fs.existsSync(path.join(full, "SKILL.md"))) {
        acc.push(full);
      } else {
        findSkillDirs(full, acc);
      }
    }
  }
  return acc;
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      if ([".git", ".DS_Store", "__MACOSX"].includes(child)) continue;
      if (/(\.env|credentials|token|\.pem|\.key)/i.test(child)) continue;
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  if (!fs.existsSync(path.join(TMP_ROOT, ".git"))) {
    fs.rmSync(TMP_ROOT, { recursive: true, force: true });
    execSync(`git clone --depth 1 ${REPO_URL} ${TMP_ROOT}`, { stdio: "inherit" });
  }

  const commitSha = execSync(`git -C ${TMP_ROOT} rev-parse --short HEAD`).toString().trim();
  const skillDirs = [
    ...findSkillDirs(path.join(TMP_ROOT, "skills")),
    ...findSkillDirs(path.resolve(process.cwd(), "skills")),
  ];

  fs.rmSync(WORK_DIR, { recursive: true, force: true });
  fs.mkdirSync(WORK_DIR, { recursive: true });

  const manifestSkills = [];

  for (const sDir of skillDirs) {
    const skillMdPath = path.join(sDir, "SKILL.md");
    let rawMd = fs.readFileSync(skillMdPath, "utf8");
    const fm = parseFrontmatter(rawMd);
    const slug = fm.name || path.basename(sDir);

    const stageSkillRoot = path.join(WORK_DIR, slug, slug);
    copyRecursive(sDir, stageSkillRoot);

    // Copy shared docs into references/shared-docs if referenced via ../
    const sharedDocsDir = path.join(TMP_ROOT, "docs");
    if (fs.existsSync(sharedDocsDir)) {
      const targetShared = path.join(stageSkillRoot, "references", "shared-docs");
      copyRecursive(sharedDocsDir, targetShared);
    }

    // Repair relative parent links (../../docs/... -> references/shared-docs/...)
    const stagedMdPath = path.join(stageSkillRoot, "SKILL.md");
    let stagedMd = fs.readFileSync(stagedMdPath, "utf8");
    let repairedLinks = 0;
    stagedMd = stagedMd.replace(/\]\((?:\.\.\/)+docs\/([^)]+)\)/g, (_m, docFile) => {
      repairedLinks++;
      return `](references/shared-docs/${docFile})`;
    });
    fs.writeFileSync(stagedMdPath, stagedMd, "utf8");

    const zipFilename = `${slug}.zip`;
    const zipOutPath = path.join(OUT_DIR, zipFilename);
    if (fs.existsSync(zipOutPath)) fs.unlinkSync(zipOutPath);

    // Create ZIP with top-level folder <slug>/
    execSync(
      `python3 -c '
import zipfile, os, sys
src_parent = sys.argv[1]
slug = sys.argv[2]
zip_path = sys.argv[3]
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
    top_dir = os.path.join(src_parent, slug)
    for root, dirs, files in os.walk(top_dir):
        for f in sorted(files):
            full = os.path.join(root, f)
            rel = os.path.relpath(full, src_parent)
            zf.write(full, rel)
' "${path.join(WORK_DIR, slug)}" "${slug}" "${zipOutPath}"`
    );

    const zipStat = fs.statSync(zipOutPath);
    const listOutput = execSync(
      `python3 -c 'import zipfile, sys; z=zipfile.ZipFile(sys.argv[1]); print("\\n".join(z.namelist())); assert z.testzip() is None' "${zipOutPath}"`
    )
      .toString()
      .trim()
      .split("\n")
      .filter(Boolean);

    const topFolders = new Set(listOutput.map((p) => p.split("/")[0]));
    const validTopFolder = topFolders.size === 1 && topFolders.has(slug);
    const hasSkillMd = listOutput.includes(`${slug}/SKILL.md`);
    const category = path.basename(path.dirname(sDir));

    manifestSkills.push({
      slug,
      category,
      version: fm.version || "1.0.0",
      description: fm.description || "",
      zipFile: `qca-skills/${zipFilename}`,
      sizeBytes: zipStat.size,
      fileCount: listOutput.length,
      repairedRelativeLinks: repairedLinks,
      validation: {
        zipIntegrity: "PASS",
        singleTopLevelFolder: validTopFolder ? "PASS" : "FAIL",
        folderMatchesYamlName: validTopFolder ? "PASS" : "FAIL",
        hasSkillMd: hasSkillMd ? "PASS" : "FAIL",
        hasFrontmatterNameAndDesc: Boolean(fm.name && fm.description) ? "PASS" : "FAIL",
        under50MB: zipStat.size < 50 * 1024 * 1024 ? "PASS" : "FAIL",
      },
      files: listOutput,
    });
  }

  const manifest = {
    generatedAtUtc: new Date().toISOString(),
    sourceRepo: REPO_URL,
    sourceCommit: commitSha,
    qcaSchemaRule: "https://docs.qoder.com/cloud-agents/api/skills/schemas.md",
    totalSkills: manifestSkills.length,
    allValid: manifestSkills.every((s) =>
      Object.values(s.validation).every((v) => v === "PASS")
    ),
    skills: manifestSkills,
  };

  fs.writeFileSync(
    path.join(OUT_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8"
  );

  console.log(
    `[AegisGate QCA Packager] Packaged & validated ${manifest.totalSkills} Moomoo skills (commit ${commitSha}). allValid=${manifest.allValid}`
  );
}

main();
