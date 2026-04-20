# 🚀 Bitron Framework

Sistema de orquestación multi-nodo basado en OpenClaw para ejecución controlada, auditable y segura de workflows.

---

# 🧩 Filosofía

Bitron NO ejecuta comandos arbitrarios.

Bitron separa completamente:

1. Discovery (qué puede hacer el nodo)
2. Planning (qué queremos hacer)
3. Builder (cómo se prepara)
4. Validation (si está permitido)
5. Execution Planning (cómo se ejecutaría)
6. Execution Runtime (quién ejecuta realmente)

👉 Resultado: ejecución controlada, reproducible y segura

---

# 🧱 Arquitectura

apps/
  cli/

packages/
  core/
  agents/
  workflows/
  openclaw-adapter/
  execution/
  execution-runtime/
  runtime/
  artifacts/
  logger/

---

# 🖥️ Nodos

Ejemplos actuales:

- intradia-vps-2 → nodo core
- marketing-vps-hetzner → devops/media
- eparking → aplicación productiva

---

# ⚙️ CLI

pnpm --filter bitron-cli run bitron -- <command>

---

# 🔍 Preflight

Valida capacidades del nodo antes de ejecutar.

bitron preflight basic --node intradia-vps-2
bitron preflight nodejs --node intradia-vps-2
bitron preflight full --node intradia-vps-2

---

# 🧠 Workflows

Pipeline completo:

bitron workflow node-build "build frontend" --node intradia-vps-2

Etapas:

1. preflight
2. planner
3. builder
4. validator
5. exec-plan
6. exec-receipt

---

# ⚡ Execution System

## Exec Profiles

bitron exec-profile-list

Ejemplo:

- node-version-check
- npm-version-check
- git-version-check

---

## Exec Plan

bitron exec-plan node-version-check --node intradia-vps-2

Incluye:

- preflight
- policy
- execRequest
- openclaw payload
- approvalTarget

---

## Exec Ready

bitron exec-ready node-version-check --node intradia-vps-2

Valida:

- binarios
- permisos
- backend
- readiness total

---

# 🧠 Exec Modes

Bitron distingue estados de ejecución:

planned → plan generado correctamente

backend-unavailable → runtime listo pero backend real no conectado

unsupported-profile → comando no permitido aún

executed → (futuro) ejecución real

---

# 🧪 Runtime

Package:

@bitron/execution-runtime

Estado actual:

- Stub activo
- No ejecuta aún
- Prepara payload real

Futuro:

- Integración con OpenClaw exec host=node

---

# 🔐 Seguridad

Bitron nunca ejecuta directo:

Siempre pasa por:

- preflight
- policy
- allowlist OpenClaw
- execution planning

---

# 📂 Artifacts

Ubicación:

.bitron/artifacts/
.bitron/logs/
.bitron/exec-ready/

Incluye:

- preflight.json
- planner.json
- builder.json
- validator.json
- exec-plan.json
- exec-receipt.json
- summary.json

---

# 🧪 Estado actual

✔ Multi-node funcionando  
✔ Preflight por perfil  
✔ Workflows operativos  
✔ Exec-plan implementado  
✔ Exec-ready implementado  
✔ Runtime desacoplado  
✔ CLI modularizada  

❌ Ejecución real en nodo (pendiente)

---

# 🚀 Próxima fase

Implementar runtime real:

OpenClawExecRuntime.execute()

Objetivo:

openclaw nodes run --node X --raw "node --version"

---

# 🧠 Resumen mental

Bitron no es un runner.

Es un sistema de ejecución:

- distribuido
- controlado
- auditable

---

# ✍️ Autor

Intradia Trading  
Bitron AI System  

https://github.com/neomaxh2o
