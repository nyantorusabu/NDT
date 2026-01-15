(function () {
	if (window.NDT) return;

	// ScratchVM
	window.NDT = {};
	if (typeof vm !== 'undefined') {
		NDT.VM = vm;
	} else if (document.getElementById('app')) {
		NDT.VM = Object.values(
			document.getElementById('app')
		)[0].child.updateQueue.lastEffect.deps[1].scratchGui.vm;
	} else {
		NDT.VM = null;
	}
	if (!NDT.VM) {
		Log(
			'e',
			'ScratchVMへのアクセスに失敗しました!\nScratchVMの仕様が変更された可能性があります'
		);
		NDT = undefined;
		return;
	}
	NDT.RT = NDT.VM.runtime;

	// Info/Option
	NDT.Info = {};
	NDT.Info.Ver = '0.1.8';
	NDT.Info.Message = `NDT.Spr.Uploadを削除し代わりにNDT.Uploadを追加`;
	NDT.Option = {};
	NDT.Option.DisCheck = false;
	NDT.Option.DisNDTEvent = false;
	NDT.Option.DisLog = false;

	// Obj
	NDT.NDTEvent = {};
	NDT.NEve = NDT.NDTEvent;
	NDT.Project = {};
	NDT.Pro = NDT.Project;
	NDT.Pro.Load = {};
	NDT.Sprite = {};
	NDT.Spr = NDT.Sprite;
	NDT.Event = {};
	NDT.Eve = NDT.Event;
	NDT.Spr.Position = {};
	NDT.Spr.Pos = NDT.Spr.Position;
	NDT.Spr.Event = {};
	NDT.Spr.Eve = NDT.Spr.Event;
	NDT.Spr.Variable = {};
	NDT.Spr.Var = NDT.Spr.Variable;
	NDT.Spr.List = {};
	NDT.Spr.Asset = {};
	NDT.Spr.Ast = NDT.Spr.Asset;
	NDT.Spr.Ast.Costume = {};
	NDT.Spr.Ast.Cos = NDT.Spr.Ast.Costume;
	NDT.Spr.Ast.Sound = {};
	NDT.Spr.Ast.Sou = NDT.Spr.Ast.Sound;
	NDT.Variable = {};
	NDT.Var = NDT.Variable;
	NDT.List = {};
	NDT.Render = {};

	// Reload
	NDT.Reload = function () {
		NDT.Spr.All = NDT.VM.runtime.targets;
		NDT.Spr.IDList = NDT.Spr.All.map((s) => s.id);
		NDT.Spr.NameList = NDT.Spr.All.map((s) => s.getName());
		NDT.Spr.Editing = NDT.VM.editingTarget;
	};
	NDT.Reload();
	NDT.RT.on('PROJECT_LOADED', () => {
		NDT.Reload();
	});
	NDT.VM.addListener('targetsUpdate', (data) => {
		NDT.Reload();
	});

	// NDTEvent
	NDT.SC = {};
	NDT.SC.AFTER_Event = [];

	class NDTEvent extends Event {
		constructor(EveID, Args = {}) {
			super(EveID);
			for (const [k, v] of Object.entries(Args)) {
				this[k] = v;
			}
		}
	}

	const Eve = new EventTarget();
	NDT.NDTEvent.Add = function (name, handler) {
		Eve.addEventListener(name, handler);
	};
	NDT.NDTEvent.Remove = function (name, handler) {
		Eve.removeEventListener(name, handler);
	};
	NDT.NDTEvent.Dispatch = function (EveID, Args = {}) {
		if (NDT.Option.DisNDTEvent) return;
		Eve.dispatchEvent(new NDTEvent(EveID, Args));
	};

	function NDTVariable() {
		if (!NDT.Var.NameList().includes('NDT')) return;
		if (NDT.Var.Get('NDT') !== 1) NDT.Var.Set('NDT', 1);
		const List = NDT.Var.NameList();
		const Vars = {
			Ver: NDT.Info.Ver,
			Update: NDT.Info.Message,
		};
		for (const [VarID, Value] of Object.entries(Vars)) {
			const LsVID = `NDT.${VarID}`;
			if (!List.includes(LsVID)) NDT.Var.Create(LsVID);
			if (NDT.Var.Get(LsVID) !== Value) NDT.Var.Set(LsVID, Value);
		}
	}

	NDT.SC.Step = NDT.RT._step;
	NDT.RT._step = function () {
		NDT.NDTEvent.Dispatch('STEP_BEFORE');
		NDTVariable();
		NDT.SC.Step.call(this);
		NDT.NDTEvent.Dispatch('STEP_AFTER');
		if (NDT.SC.AFTER_Event.length > 0) {
			for (const now of NDT.SC.AFTER_Event) {
				NDT.NDTEvent.Dispatch(now.id, now.args);
			}
			NDT.SC.AFTER_Event.length = 0;
		}
	};

	NDT.SC.StartHats = NDT.RT.startHats;
	NDT.RT.startHats = function (HatOpc, Option, Target) {
		if (NDT.Option.DisNDTEvent)
			return NDT.SC.StartHats.call(this, HatOpc, Option, Target);
		const HatID = HatOpc.toUpperCase();
		const SprID = Target?.id || 'ALL';
		const Mes = HatID == 'EVENT_WHENBROADCASTRECEIVED';
		const Flag = HatID == 'EVENT_WHENFLAGCLICKED';
		const Eve = NDT.NDTEvent.Dispatch;
		if (Mes) {
			Eve('MESSAGE_BEFORE', {
				MesID: Option.BROADCAST_OPTION.toUpperCase(),
				SprID: SprID,
			});
			NDT.SC.AFTER_Event.push({
				id: 'MESSAGE_AFTER',
				args: {
					MesID: Option.BROADCAST_OPTION.toUpperCase(),
					SprID: SprID,
				},
			});
		}
		if (Flag) {
			Eve('FLAG_BEFORE', { Option: Option, SprID: SprID });
			NDT.SC.AFTER_Event.push({
				id: 'FLAG_AFTER',
				args: { Option: Option, SprID: SprID },
			});
		}
		const Res = NDT.SC.StartHats.call(this, HatOpc, Option, Target);
		return Res;
	};

	// ========== NDTMain ==========
	// Util
	NDT.Upload = async function (...exts) {
		return await FileUpload(...exts);
	};

	// Event
	NDT.Event.Flag = function () {
		NDT.VM.greenFlag();
	};
	NDT.Event.Stop = function () {
		NDT.VM.stopAll();
	};
	NDT.Event.Message = function (Message) {
		ChkType('s', Message);
		NDT.RT.startHats('event_whenbroadcastreceived', {
			BROADCAST_OPTION: Message,
		});
	};

	// Project
	NDT.Pro.Load.URL = async function (URL) {
		ChkType('s', URL);
		const res = await fetch(URL);
		const pj = await res.arrayBuffer();
		try {
			await NDT.VM.loadProject(pj);
		} catch (e) {
			Log('e', e);
		}
	};
	NDT.Pro.Load.ID = async function (ProID) {
		ChkType('n', ProID);
		const res = await fetch(
			`https://trampoline.turbowarp.org/api/projects/${ProID}`
		);
		const data = await res.json();
		const token = data.project_token;
		try {
			await NDT.Pro.Load.URL(
				`https://projects.scratch.mit.edu/${ProID}?token=${token}`
			);
		} catch (e) {
			Log('e', e);
		}
	};
	NDT.Pro.Export = async function () {
		const Blob = await NDT.VM.saveProjectSb3();
		const aB = await Blob.arrayBuffer();
		const U8A = new Uint8Array(aB);
		const B64 = U8A.toBase64();
		return `data:application/octet-stream;base64,${B64}`;
	};
	// Sprite
	NDT.Spr.Get = function (SprID) {
		ChkType('s', SprID);
		const Sprites = NDT.Spr.All;
		let Out = Sprites.find((s) => s.id == SprID);
		if (!Out) {
			Out = Sprites.find((s) => s.getName() == SprID);
			if (!Out) {
				Log('e', `${SprID}というスプライトは見つかりませんでした`);
				return;
			}
		}
		return Out;
	};
	NDT.Spr.Runtime = function (SprID) {
		return NDT.Spr.Get(SprID).runtime;
	};
	NDT.Spr.RT = function (SprID) {
		return NDT.Spr.Runtime(SprID);
	};
	NDT.Spr.Add = async function (URL) {
		ChkType('s', URL);
		const res = await fetch(URL);
		const data = await res.arrayBuffer();
		try {
			await NDT.VM.addSprite(data);
		} catch (e) {
			Log('e', e);
		}
	};
	NDT.Spr.Delete = function (SprID) {
		ChkType('s', SprID);
		const Id = NDT.Spr.Get(SprID).id;
		NDT.VM.deleteSprite(Id);
	};
	NDT.Spr.Rename = function (SprID, NewName) {
		ChkType('s', SprID);
		ChkType('s', NewName);
		NDT.Spr.Get(SprID).name = NewName;
	};
	(NDT.Spr.Visible = function (SprID, Show = null) {
		const Spr = NDT.Spr.Get(SprID);
		if (!Spr) return;
		if (Show !== null) {
			Spr.visible = Show;
		}
		return Spr.visible;
	}),
		(NDT.Spr.Size = function (SprID, ToSize = null) {
			const Spr = NDT.Spr.Get(SprID);
			if (!Spr) return;
			if (ToSize !== null) {
				Spr.size = ToSize;
			}
			return Spr.size;
		});

	NDT.Spr.Ast.Cos.All = function (SprID) {
		return NDT.Spr.Get(SprID).sprite.costumes;
	};
	NDT.Spr.Ast.Cos.NameList = function (SprID) {
		return NDT.Spr.Ast.Cos.All(SprID).map((c) => c.name);
	};
	NDT.Spr.Ast.Cos.IDList = function (SprID) {
		return NDT.Spr.Ast.Cos.All(SprID).map((c) => c.assetId);
	};
	NDT.Spr.Ast.Cos.Get = function (SprID, CosID) {
		const CS = NDT.Spr.Ast.Cos;

		let List = CS.All(SprID).find((c) => c.assetId == CosID);
		if (!List) {
			List = CS.All(SprID).find((c) => c.name == CosID);
			if (!List) {
				Log(
					'e',
					`スプライト${SprID}に${CosID}というコスチュームは見つかりませんでした`
				);
				return;
			}
		}
		return List;
	};
	NDT.Spr.Ast.Cos.Index = function (SprID, CosID) {
		const CS = NDT.Spr.Ast.Cos;
		return CS.All(SprID).indexOf(CS.Get(SprID, CosID));
	};
	NDT.Spr.Ast.Cos.Add = async function (SprID, CosName, URL) {
		ChkType('s', URL);
		const targetId = NDT.Spr.Get(SprID).id;
		const Str = NDT.RT.storage;

		const res = await fetch(URL);
		const blob = await res.blob();

		if (!(blob.type === 'image/png' || blob.type === 'image/svg+xml')) {
			Log('e', `無効な画像形式のファイルを読み込みました: ${blob.type}`);
			return;
		}
		const assetType =
			blob.type === 'image/png'
				? Str.AssetType.ImageBitmap
				: Str.AssetType.ImageVector;

		const dataType =
			blob.type === 'image/svg+xml'
				? Str.DataFormat.SVG
				: Str.DataFormat.PNG;

		try {
			const arrayBuffer = await new Promise((resolve, reject) => {
				const fr = new FileReader();
				fr.onload = () => resolve(fr.result);
				fr.onerror = () =>
					reject(
						new Error(
							`ArrayBufferの読み込みに失敗しました: ${fr.error}`
						)
					);
				fr.readAsArrayBuffer(blob);
			});

			const asset = Str.createAsset(
				assetType,
				dataType,
				new Uint8Array(arrayBuffer),
				null,
				true
			);
			const md5ext = `${asset.assetId}.${asset.dataFormat}`;

			await NDT.VM.addCostume(
				md5ext,
				{
					asset,
					md5ext,
					name: CosName,
				},
				targetId
			);
		} catch (e) {
			Log('e', e);
		}
	};
	NDT.Spr.Ast.Cos.Delete = function (SprID, CosID) {
		const target = NDT.Spr.Get(SprID);
		const costumeIndex = NDT.Spr.Ast.Cos.Index(SprID, CosID);
		if (costumeIndex < 0) return;

		if (target.sprite.costumes.length > 0) {
			target.deleteCostume(costumeIndex);
		}
	};
	NDT.Spr.Ast.Cos.Rename = function (SprID, CosID, NewName) {
		const target = NDT.Spr.Get(SprID);
		const costumeIndex = NDT.Spr.Ast.Cos.Index(SprID, CosID);
		if (costumeIndex < 0) return;

		if (target.sprite.costumes.length > 0) {
			target.renameCostume(costumeIndex, NewName);
		}
	};
	NDT.Spr.Ast.Cos.Export = function (SprID, CosID) {
		return NDT.Spr.Ast.Cos.Get(SprID, CosID).asset.encodeDataURI();
	};

	NDT.Spr.Ast.Sou.All = function (SprID) {
		return NDT.Spr.Get(SprID).sprite.sounds;
	};
	NDT.Spr.Ast.Sou.NameList = function (SprID) {
		return NDT.Spr.Ast.Sou.All(SprID).map((c) => c.name);
	};
	NDT.Spr.Ast.Sou.IDList = function (SprID) {
		return NDT.Spr.Ast.Sou.All(SprID).map((c) => c.assetId);
	};
	NDT.Spr.Ast.Sou.Get = function (SprID, SouID) {
		const SD = NDT.Spr.Ast.Sou;

		let List = SD.All(SprID).find((c) => c.assetId == SouID);
		if (!List) {
			List = SD.All(SprID).find((c) => c.name == SouID);
			if (!List) {
				Log(
					'e',
					`スプライト${SprID}に${SouID}という音源は見つかりませんでした`
				);
				return;
			}
		}
		return List;
	};
	NDT.Spr.Ast.Sou.Index = function (SprID, SouID) {
		const SD = NDT.Spr.Ast.Sou;
		return SD.All(SprID).indexOf(SD.Get(SprID, SouID));
	};
	NDT.Spr.Ast.Sou.Add = async function (SprID, SouName, URL) {
		ChkType('s', URL);
		const targetId = NDT.Spr.Get(SprID).id;
		const Str = NDT.RT.storage;

		const res = await fetch(URL);
		const buffer = await res.arrayBuffer();

		const asset = Str.createAsset(
			Str.AssetType.Sound,
			Str.DataFormat.MP3,
			new Uint8Array(buffer),
			null,
			true
		);

		try {
			await NDT.VM.addSound(
				{
					asset,
					md5: asset.assetId + '.' + asset.dataFormat,
					name: SouName,
				},
				targetId
			);
		} catch (e) {
			Log('e', e);
		}
	};
	NDT.Spr.Ast.Sou.Delete = function (SprID, SouID) {
		const target = NDT.Spr.Get(SprID);
		const soundIndex = NDT.Spr.Ast.Sou.Index(SprID, SouID);
		if (soundIndex < 0) return;

		if (target.sprite.sounds.length > 0) {
			target.deleteSound(soundIndex);
		}
	};
	NDT.Spr.Ast.Sou.Rename = function (SprID, SouID, NewName) {
		const target = NDT.Spr.Get(SprID);
		const soundIndex = NDT.Spr.Ast.Sou.Index(SprID, SouID);
		if (soundIndex < 0) return;

		if (target.sprite.sounds.length > 0) {
			target.renameSound(soundIndex, NewName);
		}
	};
	NDT.Spr.Ast.Sou.Export = function (SprID, SouID) {
		return NDT.Spr.Ast.Sou.Get(SprID, SouID).asset.encodeDataURI();
	};

	NDT.Spr.Pos.Get = function (SprID) {
		const Spr = NDT.Spr.Get(SprID);
		if (!Spr) return;
		return { x: Spr.x, y: Spr.y, Dir: Spr.direction };
	};
	NDT.Spr.Pos.Goto = function (SprID, ToX = null, ToY = null) {
		const Spr = NDT.Spr.Get(SprID);
		if (!Spr) return;
		if (ToX !== null) Spr.x = ToX;
		if (ToY !== null) Spr.y = ToY;
		return { x: Spr.x, y: Spr.y };
	};
	NDT.Spr.Pos.MoveXY = function (SprID, StepX = null, StepY = null) {
		const Spr = NDT.Spr.Get(SprID);
		if (!Spr) return;
		if (StepX !== null) Spr.x += StepX;
		if (StepY !== null) Spr.y += StepY;
		return { x: Spr.x, y: Spr.y };
	};
	NDT.Spr.Pos.Move = function (SprID, Steps) {
		const Spr = NDT.Spr.Get(SprID);
		if (!Spr) return;
		const Radians = (Math.PI / 180) * (90 - Spr.direction);
		const StepX = Steps * Math.cos(Radians);
		const StepY = Steps * Math.sin(Radians);
		Spr.x += StepX;
		Spr.y += StepY;
		return { x: Spr.x, y: Spr.y };
	};
	NDT.Spr.Pos.SetDir = function (SprID, Dir = null) {
		const Spr = NDT.Spr.Get(SprID);
		if (!Spr) return;
		if (Dir !== null) Spr.direction = Dir;
		return { Dir: direction };
	};
	NDT.Spr.Pos.Turn = function (SprID, Dir) {
		const Spr = NDT.Spr.Get(SprID);
		if (!Spr) return;
		if (Dir) Spr.direction += Dir;
		return { Dir: Spr.direction };
	};

	NDT.Spr.Eve.Flag = function (SprID) {
		ChkType('s', SprID);
		const target = NDT.Spr.Get(SprID);
		if (!target) return;
		NDT.RT.startHats('event_whenflagclicked', {}, target);
	};
	NDT.Spr.Eve.Stop = function (SprID) {
		ChkType('s', SprID);
		const target = NDT.Spr.Get(SprID);
		if (!target) return;
		NDT.RT.stopForTarget(target);
	};
	NDT.Spr.Eve.Message = function (SprID, Message) {
		ChkType('s', SprID);
		ChkType('s', Message);
		const target = NDT.Spr.Get(SprID);
		if (!target) return;
		NDT.RT.startHats(
			'event_whenbroadcastreceived',
			{ BROADCAST_OPTION: Message },
			target
		);
	};

	NDT.Spr.Var.All = function (SprID) {
		const target = NDT.Spr.Get(SprID);
		if (!target) return;
		return Object.values(target.variables).filter((v) => v.type == '');
	};
	NDT.Spr.Var.IDList = function (SprID) {
		return NDT.Spr.Var.All(SprID).map((v) => v.id);
	};
	NDT.Spr.Var.NameList = function (SprID) {
		return NDT.Spr.Var.All(SprID).map((v) => v.name);
	};
	NDT.Spr.Var.GetFull = function (SprID, VarID) {
		ChkType('s', SprID);
		ChkType('s', VarID);
		const target = NDT.Spr.Get(SprID);
		if (!target) return;
		const Vars = Object.values(target.variables);
		let Out = Vars.find((v) => v.id === VarID && v.type == '');
		if (!Out) {
			Out = Vars.find((v) => v.name === VarID && v.type == '');
			if (!Out) {
				Log(
					'e',
					`スプライト${SprID}に${VarID}というローカル変数は見つかりませんでした`
				);
				return;
			}
		}
		return Out;
	};
	NDT.Spr.Var.Get = function (SprID, VarID) {
		return NDT.Spr.Var.GetFull(SprID, VarID).value;
	};
	NDT.Spr.Var.Set = function (SprID, VarID, Value) {
		NDT.Spr.Var.GetFull(SprID, VarID).value = Value;
	};
	NDT.Spr.Var.Change = function (SprID, VarID, Value) {
		NDT.Spr.Var.GetFull(SprID, VarID).value += Value;
	};
	NDT.Spr.Var.Rename = function (SprID, VarID, NewName) {
		NDT.Spr.Var.GetFull(SprID, VarID).name = NewName;
	};
	NDT.Spr.Var.Create = function (SprID, VarName) {
		const UID = GenerateUid();
		NDT.Spr.Get(SprID).createVariable(UID, VarName, '');
	};
	NDT.Spr.Var.Delete = function (SprID, VarID) {
		const ID = NDT.Spr.Var.GetFull(SprID, VarID).id;
		NDT.Spr.Get(SprID).deleteVariable(ID);
	};

	NDT.Spr.List.All = function (SprID) {
		const target = NDT.Spr.Get(SprID);
		if (!target) return;
		return Object.values(target.variables).filter((v) => v.type == 'list');
	};
	NDT.Spr.List.IDList = function (SprID) {
		return NDT.Spr.List.All(SprID).map((v) => v.id);
	};
	NDT.Spr.List.NameList = function (SprID) {
		return NDT.Spr.List.All(SprID).map((v) => v.name);
	};
	NDT.Spr.List.GetFull = function (SprID, VarID) {
		ChkType('s', SprID);
		ChkType('s', VarID);
		const target = NDT.Spr.Get(SprID);
		if (!target) return;
		const Vars = Object.values(target.variables);
		let Out = Vars.find((v) => v.id === VarID && v.type == 'list');
		if (!Out) {
			Out = Vars.find((v) => v.name === VarID && v.type == 'list');
			if (!Out) {
				Log(
					'e',
					`スプライト${SprID}に${VarID}というローカルリストは見つかりませんでした`
				);
				return;
			}
		}
		return Out;
	};
	NDT.Spr.List.Get = function (SprID, VarID) {
		return NDT.Spr.List.GetFull(SprID, VarID).value;
	};
	NDT.Spr.List.SetArray = function (SprID, VarID, Value) {
		const List = NDT.Spr.List.Get(SprID, VarID);
		List.length = 0;
		List.push(...Value);
	};
	NDT.Spr.List.Create = function (SprID, VarName) {
		const UID = GenerateUid();
		NDT.Spr.Get(SprID).createVariable(UID, VarName, 'list');
	};
	NDT.Spr.List.Delete = function (SprID, VarID) {
		const ID = NDT.Spr.List.GetFull(SprID, VarID).id;
		NDT.Spr.Get(SprID).deleteVariable(ID);
	};
	NDT.Spr.List.Rename = function (SprID, VarID, NewName) {
		NDT.Spr.List.GetFull(SprID, VarID).name = NewName;
	};

	// Variable
	NDT.Var.All = function () {
		const SprID = NDT.Spr.All.find((s) => s.isStage).id;
		if (!SprID) {
			Log('e', 'ステージを発見できませんでした');
			return;
		}
		return NDT.Spr.Var.All(SprID);
	};
	NDT.Var.IDList = function () {
		return NDT.Var.All().map((v) => v.id);
	};
	NDT.Var.NameList = function () {
		return NDT.Var.All().map((v) => v.name);
	};
	NDT.Var.GetFull = function (VarID) {
		ChkType('s', VarID);
		const target = NDT.Spr.All.find((s) => s.isStage);
		if (!target) {
			Log('e', 'ステージを発見できませんでした');
			return;
		}
		const Vars = Object.values(target.variables);
		let Out = Vars.find((v) => v.id === VarID && v.type == '');
		if (!Out) {
			Out = Vars.find((v) => v.name === VarID && v.type == '');
			if (!Out) {
				Log('e', `${VarID}というグローバル変数は見つかりませんでした`);
				return;
			}
		}
		return Out;
	};
	NDT.Var.Get = function (VarID) {
		return NDT.Var.GetFull(VarID).value;
	};
	NDT.Var.Set = function (VarID, Value) {
		NDT.Var.GetFull(VarID).value = Value;
	};
	NDT.Var.Change = function (VarID, Value) {
		NDT.Var.GetFull(VarID).value += Value;
	};
	NDT.Var.Create = function (VarName) {
		NDT.RT.createNewGlobalVariable(VarName);
	};
	NDT.Var.Delete = function (VarID) {
		ChkType('s', VarID);
		const SprID = NDT.Spr.All.find((s) => s.isStage).id;
		if (!SprID) {
			Log('e', 'ステージを発見できませんでした');
			return;
		}
		NDT.Spr.Get(SprID).deleteVariable(NDT.Var.GetFull(VarID).id);
	};
	NDT.Var.Rename = function (VarID, NewName) {
		NDT.Var.GetFull(VarID).name = NewName;
	};

	// List
	NDT.List.All = function () {
		const SprID = NDT.Spr.All.find((s) => s.isStage).id;
		if (!SprID) {
			Log('e', 'ステージを発見できませんでした');
			return;
		}
		return NDT.Spr.List.All(SprID);
	};
	NDT.List.IDList = function () {
		return NDT.List.All().map((v) => v.id);
	};
	NDT.List.NameList = function () {
		return NDT.List.All().map((v) => v.name);
	};
	NDT.List.GetFull = function (VarID) {
		ChkType('s', VarID);
		const target = NDT.Spr.All.find((s) => s.isStage);
		if (!target) {
			Log('e', 'ステージを発見できませんでした');
			return;
		}
		const Vars = Object.values(target.variables);
		let Out = Vars.find((v) => v.id === VarID && v.type == 'list');
		if (!Out) {
			Out = Vars.find((v) => v.name === VarID && v.type == 'list');
			if (!Out) {
				Log(
					'e',
					`${VarID}というグローバルリストは見つかりませんでした`
				);
				return;
			}
		}
		return Out;
	};
	NDT.List.Get = function (VarID) {
		return NDT.List.GetFull(VarID).value;
	};
	NDT.List.SetArray = function (VarID, Value) {
		const List = NDT.List.Get(VarID);
		List.length = 0;
		List.push(...Value);
	};
	NDT.List.Create = function (VarName) {
		NDT.RT.createNewGlobalVariable(VarName, undefined, 'list');
	};
	NDT.List.Delete = function (VarID) {
		ChkType('s', VarID);
		const SprID = NDT.Spr.All.find((s) => s.isStage).id;
		if (!SprID) {
			Log('e', 'ステージを発見できませんでした');
			return;
		}
		NDT.Spr.Get(SprID).deleteVariable(NDT.List.GetFull(VarID).id);
	};
	NDT.List.Rename = function (VarID, NewName) {
		NDT.List.GetFull(VarID).name = NewName;
	};

	// 色々使う関数
	// 短縮表現変換
	function Abbreviation(code, ...link) {
		for (const word of link) {
			if (code.toLowerCase().startsWith(word.toLowerCase()[0])) {
				return word;
			}
		}
		Log('w', `引数として想定されていない値が入力されました: ${code}`);
		return code;
	}
	// ログ
	function Log(type = 'log', output) {
		if (NDT.Option.DisLog) return;
		const lstype = Abbreviation(type, 'log', 'warn', 'error');
		console[lstype](`[NDT] ${output}`);
	}
	// 型チェック
	function ChkType(type, data) {
		if (NDT.Option.DisCheck) return;
		const lstype = Abbreviation(
			type,
			'Number',
			'String',
			'Symbol',
			'Boolean',
			'BigInt',
			'Undefined',
			'Null',
			'Object',
			'Function'
		);
		if ((typeof data).toLowerCase() !== lstype.toLowerCase()) {
			Log(
				'e',
				`引数に指定できない型が指定されています!:\n入力=>${typeof data} 要求=>${lstype}`
			);
		}
	}
	// ファイルのアップロード
	async function FileUpload(...exts) {
		const [handle] = await window.showOpenFilePicker({
			types: [
				{
					accept: {
						'*/*': exts,
					},
				},
			],
		});
		const file = await handle.getFile();
		const reader = new FileReader();
		return new Promise((resolve) => {
			reader.onload = (e) => resolve(e.target.result);
			reader.readAsDataURL(file);
		});
	}
	// ランダムなIDの生成
	function GenerateUid() {
		return (
			Math.random().toString(36).substring(2, 12) +
			Math.random().toString(36).substring(2, 12)
		);
	}

	// イベント
	document.dispatchEvent(new Event('NDT_Loaded'));
	Log('l', `NDT V${NDT.Info.Ver} is Loaded.`);
	Log('l', `Update:\n${NDT.Info.Message}`);
})();
