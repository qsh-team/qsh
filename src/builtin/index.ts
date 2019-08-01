import QSH from "../qsh";
import initExit from "./exit";
import initCd from "./cd";

export default function initBuiltin(qsh: QSH) {
    initExit(qsh);
    initCd(qsh);
}