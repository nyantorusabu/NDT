// 「NDT.FLAG」というメッセージを送ると緑の旗を押す
NDT.NEve.Add('MESSAGE_BEFORE', (e) => {
    if (e.MesID !== 'NDT.FLAG') return;
    NDT.Eve.Flag();
})

// 緑の旗が押された時「NDT.Start」というメッセージを送る
NDT.NEve.Add('FLAG_BEFORE', () => {
    NDT.Eve.Message('NDT.Start');
})

// グローバル変数「NDT.eval」に0以外の文字列が入っていたらevalで評価し結果をグローバル変数「NDT.evalOut」に格納
NDT.NEve.Add('STEP_AFTER', (e) => {
    if (!NDT.Var.NameList().includes('NDT.eval')) return;
    if (NDT.Var.Get('NDT.eval') == 0) return;
    const Code = NDT.Var.Get('NDT.eval');
    NDT.Var.Set('NDT.eval', 0);
    try {
        let Out = eval(Code);
        if (!(typeof Out == 'string' || typeof Out == 'number')) Out = JSON.stringify(Out);
        if (!(typeof Out == 'string' || typeof Out == 'number')) Out = String(Out);
        if (!NDT.Var.NameList().includes('NDT.evalOut')) return;
        NDT.Var.Set('NDT.evalOut', Out);
    } catch (e) {
        NDT.Var.Set('NDT.evalOut', String(e));
    }
})