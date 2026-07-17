# TechMarket Orders - CI/CD Blue-Green sobre Kubernetes (K3s)

**Curso:** Ciclo de Vida del Software II - AUY1104
**Estudiante:** Eduardo Urbina
**Evaluacion:** Examen Final Transversal (EFT)

## 1. Arquitectura de la solucion

Flujo del pipeline:

1. Push a main dispara el job deps-and-test (npm ci + npm test)
2. Si pasa, se ejecuta build-and-push (workflow reutilizable): construye la imagen Docker y la publica en Docker Hub
3. Si pasa, se ejecuta deploy-blue-green (workflow reutilizable): se conecta por SSH al servidor K3s y corre un script que:
   - Detecta cual color esta activo (blue o green)
   - Despliega la imagen nueva en el color INACTIVO
   - Valida su salud internamente contra el ClusterIP
   - Si la validacion es exitosa, cambia el selector del Service publico (switch atomico)
   - Ejecuta un smoke test post-switch; si falla, revierte el selector automaticamente

Nota sobre infraestructura: siguiendo indicacion del docente, esta implementacion usa K3s sobre EC2 en lugar de Amazon EKS, y Docker Hub en lugar de Amazon ECR. K3s implementa la API estandar de Kubernetes, por lo que la logica de Blue-Green, workflows reutilizables y rollback automatico es equivalente a una implementacion sobre EKS.

## 2. Repositorios

- AUY1104-SharedClient: https://github.com/edoturb/AUY1104-SharedClient - codigo fuente Node.js/Express, pipeline principal (deploy-orders.yaml), manifiestos K8s
- AUY1104-SharedWorkflows: https://github.com/edoturb/AUY1104-SharedWorkflows - workflows reutilizables (build-push-dockerhub.yaml, deploy-bluegreen-k3s.yaml)

## 3. Estrategia de despliegue: Blue-Green

Se eligio Blue-Green por sobre Canary por dos razones tecnicas:

1. Rollback atomico: el cambio de trafico ocurre con un solo kubectl patch service que modifica el selector, revierte en menos de 1 segundo.
2. Simplicidad de diagnostico: con Blue-Green la version activa siempre es 100% una u otra, sin ambiguedad sobre que porcentaje de usuarios ve el fallo.

## 4. Como se activa la remediacion automatica

El script de despliegue (remote-deploy.sh, generado dinamicamente por el workflow reutilizable deploy-bluegreen-k3s.yaml) usa "set -e", por lo que cualquier comando que falle detiene la ejecucion antes de tocar el trafico real:

- Si kubectl rollout status no completa en 90s (ej. imagen inexistente) -> el pipeline falla y el Service publico nunca cambia.
- Si el health-check interno no responde 200 OK en 5 intentos -> el pipeline falla y el Service publico nunca cambia.
- Si el smoke test post-switch falla -> el script revierte el patch del Service de vuelta al color anterior, de forma explicita.

En los tres casos, el resultado es el mismo: el trafico de usuarios reales nunca queda expuesto a una version rota.

## 5. Evidencias

| Evidencia | Escenario | Resultado | Link |
|---|---|---|---|
| E1 | Despliegue exitoso Blue-Green | Switch completado, servicio validado | https://github.com/edoturb/AUY1104-SharedClient/actions/workflows/deploy-orders.yaml |
| E2 | Chaos Drill - imagen inexistente | Rollout nunca completa, trafico protegido, servicio sin interrupcion | https://github.com/edoturb/AUY1104-SharedClient/actions/runs/29614472833 |
| E3 | Chaos Drill - ruta de salud invalida | Validacion de negocio falla, switch nunca ocurre, servicio sin interrupcion | https://github.com/edoturb/AUY1104-SharedClient/actions/runs/29615316056 |

En ambos escenarios de fallo (E2, E3) se verifico con curl -I que el servicio siguio respondiendo 200 OK durante todo el incidente, confirmando cero downtime para el usuario final.

## 6. Comparacion de estrategias de despliegue

| Estrategia | Downtime | Exposicion a fallo | Rollback | Tiempo de recuperacion |
|---|---|---|---|---|
| All-in-once | Total | 100% de usuarios | Redespliegue completo | Alto |
| Rolling Update | Cero | Total eventual (gradual) | rollout undo | Lento (igual al deploy) |
| Canary | Cero | Controlada (porcentaje configurable) | Scale a 0 replicas canary | Bajo |
| Blue-Green (implementada) | Cero | Cero (nunca se expone hasta validar) | kubectl patch service | Menos de 1 segundo |

## 7. Aplicacion al negocio

Para un servicio critico como "TechMarket Orders", donde una caida afecta directamente ventas activas, Blue-Green minimiza el riesgo mejor que Rolling Update: la validacion ocurre antes de exponer trafico real, no durante. El costo adicional de mantener 2 versiones corriendo en paralelo momentaneamente es aceptable frente al beneficio de continuidad operativa garantizada, especialmente considerando que el rollback es practicamente instantaneo si algo falla despues del switch.

## 8. Declaracion de uso de Inteligencia Artificial

Se utilizo Claude (Anthropic) como asistente durante el desarrollo de esta evaluacion, especificamente para:

- Diseno de la arquitectura de workflows reutilizables de GitHub Actions
- Redaccion y depuracion del script de despliegue Blue-Green (remote-deploy.sh)
- Diagnostico de errores durante la implementacion (fallos de readinessProbe, ImagePullBackOff, sincronizacion de secrets de GitHub, problemas de conectividad SSH, corrupcion de archivos YAML al editar)
- Redaccion de este documento tecnico

Todo el codigo fue revisado, probado y validado por el estudiante en el entorno real (AWS Academy Learner Lab), incluyendo la ejecucion de los pipelines y la verificacion manual de resultados documentada en la seccion de Evidencias.

## 9. Referencias

Anthropic. (2026). Claude (Sonnet 4.6) [Modelo de lenguaje de gran escala]. https://claude.ai

The Kubernetes Authors. (2026). Kubernetes documentation. https://kubernetes.io/docs/

GitHub, Inc. (2026). GitHub Actions documentation. https://docs.github.com/actions

Docker, Inc. (2026). Docker Hub documentation. https://docs.docker.com/docker-hub/
