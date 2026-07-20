#define AppName "Veiron Control Center"
#define AppVersion "0.2.0"
#define AppPublisher "Veiron Network"
#define AppExeName "veiron-desktop.exe"

[Setup]
AppId={{FAF86C86-E7EC-4EA9-A2C8-1F934DBDBD8E}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={localappdata}\Programs\Veiron Control Center
DefaultGroupName=Veiron Network
PrivilegesRequired=lowest
OutputDir=..\..\release-artifacts
OutputBaseFilename=Veiron-Control-Center-{#AppVersion}-Windows-x64-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayIcon={app}\{#AppExeName}
SetupLogging=yes
CloseApplications=yes

[Files]
Source: "stage\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "stage\configs\mainnet-candidate.toml"; DestDir: "{localappdata}\Veiron\ControlCenter\.veiron-local"; DestName: "node.toml"; Flags: onlyifdoesntexist uninsneveruninstall

[Dirs]
Name: "{localappdata}\Veiron\ControlCenter\.veiron-local"; Flags: uninsneveruninstall
Name: "{localappdata}\Veiron\ControlCenter\.veiron-local\chain"; Flags: uninsneveruninstall
Name: "{localappdata}\Veiron\ControlCenter\.veiron-local\mempool"; Flags: uninsneveruninstall
Name: "{localappdata}\Veiron\ControlCenter\.veiron-local\indexer"; Flags: uninsneveruninstall
Name: "{localappdata}\Veiron\ControlCenter\.veiron-local\node"; Flags: uninsneveruninstall
Name: "{localappdata}\Veiron\ControlCenter\.veiron-local\logs"; Flags: uninsneveruninstall
Name: "{localappdata}\Veiron\ControlCenter\.veiron-local\backups"; Flags: uninsneveruninstall

[Icons]
Name: "{group}\Veiron Control Center"; Filename: "{app}\{#AppExeName}"
Name: "{autodesktop}\Veiron Control Center"; Filename: "{app}\{#AppExeName}"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional shortcuts:"

[Run]
Filename: "{app}\{#AppExeName}"; Description: "Launch Veiron Control Center"; Flags: nowait postinstall skipifsilent

[UninstallRun]
Filename: "powershell.exe"; Parameters: "-NoLogo -NoProfile -ExecutionPolicy Bypass -File ""{app}\veiron.ps1"" stop"; Flags: runhidden waituntilterminated; RunOnceId: "StopVeironServices"

[Code]
var
  NetworkPage: TOutputMsgWizardPage;
  StoragePage: TOutputMsgWizardPage;
  SafetyPage: TOutputMsgWizardPage;

procedure InitializeWizard;
begin
  NetworkPage := CreateOutputMsgPage(
    wpSelectDir,
    'Network mode',
    'Veiron Mainnet Candidate peer-to-peer node',
    'The node uses encrypted TCP P2P on port 20787 and local RPC on 127.0.0.1:10787.' + #13#10 + #13#10 +
    'No public seed node is bundled in this candidate build. Add reviewed seed multiaddresses to node.toml before expecting public synchronization. Windows Firewall may ask for permission when P2P starts.'
  );
  StoragePage := CreateOutputMsgPage(
    NetworkPage.ID,
    'Persistent blockchain data',
    'Chain data is retained across application upgrades and uninstall',
    'Persistent data location:' + #13#10 +
    ExpandConstant('{localappdata}\Veiron\ControlCenter\.veiron-local') + #13#10 + #13#10 +
    'This includes the chain, mempool, index, P2P node identity, logs and backups. The uninstaller stops services but does not delete these folders.'
  );
  SafetyPage := CreateOutputMsgPage(
    StoragePage.ID,
    'Wallet and release status',
    'Review before installation',
    'Wallet credentials remain in Windows Credential Manager and are never stored in the installation folder.' + #13#10 + #13#10 +
    'Status: Planned / Mainnet Candidate / Prototype. This installer is not evidence of a public mainnet launch.'
  );
end;
