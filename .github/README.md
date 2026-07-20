# Veiron GitHub Workflows — independent releases

Pachetul reconstruieste release-urile Veiron astfel incat Windows, Linux si VPS sa publice independent. O platforma care esueaza nu blocheaza artefactele celorlalte.

## Instalare recomandata

```powershell
.\install-workflows.ps1 -RepoPath "D:\Blockchain-Core\Veiron_Network"
```

Installerul:

- face backup la workflow-urile existente;
- elimina `candidate-release.yml` si `rust.yml`, care duplicau sau cuplau procesele;
- instaleaza workflow-urile independente;
- instaleaza managerul interactiv in `scripts/release/`.

Dupa instalare:

```powershell
cd D:\Blockchain-Core\Veiron_Network
git add .github/workflows scripts/release
git commit -m "ci: independent releases and local artifact publishing"
git push
.\scripts\release\veiron-release.cmd
```

## Release normal

Un tag de forma `vX.Y.Z-candidate.N` porneste separat:

- Candidate Windows Release;
- Candidate Linux Release;
- Candidate VPS Release;
- Candidate Quality Checks.

Fiecare platforma isi publica artefactele direct in acelasi GitHub prerelease.

## Refolosirea build-urilor locale

Managerul verifica implicit:

```text
<repository>\release-artifacts
```

Pentru repository-ul indicat, acesta este:

```text
D:\Blockchain-Core\Veiron_Network\release-artifacts
```

Fisierele recente pot fi urcate direct in GitHub Release. Scriptul genereaza checksum SHA-256 si marcheaza separat platforma detectata. Workflow-ul acelei platforme se opreste intentionat, iar platformele fara artefact local continua sa construiasca.

Detectare principala:

- `.exe`, `.msi`, installer/setup/portable/zip → Windows;
- `.AppImage`, `.deb`, `.rpm`, nume Linux → Linux;
- `.tar.gz`, nume VPS/control-plane/server-bundle → VPS.

Fisierele Electron si `latest.yml`/`latest-linux.yml` sunt excluse.

## Relansare fortata

Managerul poate relansa Windows, Linux sau VPS pentru un tag existent. Relansarea manuala foloseste `force_build=true`, asa ca functioneaza inclusiv pentru tag-urile marcate cu artefacte locale.

## Cerinte GitHub

Workflow-urile de release declara `permissions: contents: write`. Politica repository-ului sau organizatiei trebuie sa permita GitHub Actions sa creeze si sa modifice releases.

Pentru functiile locale este necesar GitHub CLI:

```powershell
gh auth login
```

Consulta si `CUM-FACI-RELEASE.md` pentru fluxul complet.

## Fix v3.1.0

- initializeaza explicit variabilele de tag pentru compatibilitate cu `Set-StrictMode`;
- evita reutilizarea variabilei `$tag` in bucle helper;
- afiseaza fisierul si linia exacta daca mai apare o eroare PowerShell.
