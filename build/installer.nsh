!macro customHeader
  !include "nsDialogs.nsh"
  !include "LogicLib.nsh"
!macroend

Var LicenseFilePath
Var LicenseFileInput
Var LicenseBrowseButton

!macro customPageAfterChangeDir
  Page custom LicensePageCreate LicensePageLeave
!macroend

Function LicensePageCreate
  nsDialogs::Create 1018
  Pop $0

  ${If} $0 == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 24u "Choose your docalert.license file to continue installing DocAlert."
  Pop $0

  ${NSD_CreateLabel} 0 22u 100% 24u "This license file is required for first-time installation."
  Pop $0

  ${If} $LicenseFilePath == ""
    IfFileExists "$APPDATA\DocAlert\docalert.license" 0 +2
      StrCpy $LicenseFilePath "$APPDATA\DocAlert\docalert.license"
  ${EndIf}

  ${NSD_CreateFileRequest} 0 52u 78% 14u "$LicenseFilePath"
  Pop $LicenseFileInput

  ${NSD_CreateBrowseButton} 80% 52u 20% 14u "Browse..."
  Pop $LicenseBrowseButton
  ${NSD_OnClick} $LicenseBrowseButton BrowseForLicenseFile

  nsDialogs::Show
FunctionEnd

Function BrowseForLicenseFile
  nsDialogs::SelectFileDialog open "$LicenseFilePath" "DocAlert License (*.license;*.licence)|*.license;*.licence|All Files (*.*)|*.*"
  Pop $0

  ${If} $0 != error
    StrCpy $LicenseFilePath $0
    ${NSD_SetText} $LicenseFileInput $LicenseFilePath
  ${EndIf}
FunctionEnd

Function LicensePageLeave
  ${NSD_GetText} $LicenseFileInput $LicenseFilePath

  ${If} $LicenseFilePath == ""
    MessageBox MB_ICONEXCLAMATION|MB_OK "Please choose your docalert.license file to continue."
    Abort
  ${EndIf}

  IfFileExists "$LicenseFilePath" LicenseFileFound LicenseFileMissing

  LicenseFileMissing:
    MessageBox MB_ICONEXCLAMATION|MB_OK "The selected license file could not be found. Please choose a valid docalert.license file."
    Abort

  LicenseFileFound:
FunctionEnd

!macro customInstall
  CreateDirectory "$APPDATA\DocAlert"
  ${If} "$LicenseFilePath" != "$APPDATA\DocAlert\docalert.license"
    CopyFiles /SILENT "$LicenseFilePath" "$APPDATA\DocAlert\docalert.license"
  ${EndIf}
!macroend
