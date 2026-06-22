require('colors');

const logo = `
MMMMMMMMMMMMMMN0dc,..       ..,:oOXWMMMMMMMMMMMMMMMMM
MMMMMMMMMMMWKo,.                 .cONMMMMMMMMMMMMMMMM
MMMMMMMMMMXo.                      .:OWMMMMMMMMMMMMMM
MMMMMMMMW0;                          .oXMMMMMMMMMMMMM
MMMMMMMMO'                             cXMMMMMMMMMMMM
MMMMMMMK;                               oNMMMMMMMMMMM
MMMMMMNl                                .OMMMMMMMMMMM
MMMMMM0'                                  oWMMMMMMMMM
MMMMMWd                                   :NMMMMMMMMM
MMMMMN:                                    ,KMMMMMMMM
MMMMMK,                                    ,KMMMMMMMM
MMMMM0'                                     ,KMMMMMMM
MMMMM0,  ..                          .....  ,KMMMMMMM
MMMMMN: .kX0xl;.                  .:ok0XXx. cNMMMMMMM
MMMMMMk. cNMMMWKx;.              ,xXWMMMM0; .kMMMMMMM
MMMMMMNl .oNMMMMMWO;            .dNMMMMMW0,  lNMMMMMM
MMMMMMMXc .cKWMMMMMNo.         'OWMMMMMXd.   :XMMMMMM
MMMMMMMMXl  .l0NMMMMNo.       .kWMMMN0o'    :KMMMMMMM
MMMMMMMMMNd.  .,cdOKX0,      ;00kdc,.     cXMMMMMMMMM
MMMMMMMMMMWk'      ....       ..        .oNMMMMMMMMMM
MMMMMMMMMMMMKc.                        ,kWMMMMMMMMMMM
MMMMMMMMMMMMMNx'                     .lKMMMMMMMMMMMMM
MMMMMMMMMMMMMMWKo.                 .:OWMMMMMMMMMMMMMM
MMMMMMMMMMMMMMMMWKo,.            .cONMMMMMMMMMMMMMMMM
MMMMMMMMMMMMMMMMMMMXx;.        'l0WMMMMMMMMMMMMMMMMMM  
┏┓┓•    ┏┓  ┓   
┣┫┃┓┏┓┏┓┗┓┏┓┃┏┓┏
┛┗┗┗┗ ┛┗┗┛┗┻┗┗ ┛    - Desenvolvido por Apx > telegram: @apexis_0 | Discord: @semprefirme
`;

function displayLogo() {
  console.clear();
  console.log(logo.green);
}

module.exports = { displayLogo };