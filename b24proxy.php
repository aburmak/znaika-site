<?php
/* b24proxy.php — локальный служебный прокси для формы Bitrix24 (id 23).
   Серверная отправка: кросс-доменный CORS не нужен, файлы прикрепляются
   надёжно (протокол crm.site.fileUploader.upload + crm.site.form.fill).
   Ключевое: загрузка и заполнение выполняются в ОДНОЙ сессии Bitrix
   (cookie-джар), иначе сервер не связывает токены файлов с заявлением. */

header('Content-Type: application/json; charset=UTF-8');

define('B24_ADDRESS', 'https://b24-ll39bk.bitrix24.ru');
define('B24_ID', '23');
define('B24_SEC', 'eiogx2');
define('B24_CONTROLLER', 'crm.fileUploader.siteFormFileUploaderController');
define('SUCCESS_MSG', "Спасибо, ваше заявление принято к рассмотрению.\n В течение 5 рабочих дней, вам будет отправлена квитанция на оплату на указанный email");
define('B24_DEBUG', true);
define('B24_DEBUG_LOG', __DIR__ . '/_proxy_debug.log');

function b24_debug($line)
{
	if (!B24_DEBUG) {
		return;
	}
	@file_put_contents(B24_DEBUG_LOG, '[' . date('Y-m-d H:i:s') . '] ' . $line . "\n", FILE_APPEND);
}

/* Входящий вебхук CRM для надёжного прикрепления файлов.
   Создайте: CRM → Интеграции → Вебхуки → Входящий вебхук → права:
   crm (контакт + все права) → скопируйте URL вида:
   https://b24-ll39bk.bitrix24.ru/rest/1/abc123.../  и вставьте ниже. */
$B24_WEBHOOK = '';

$GLOBALS['B24_JAR'] = array();

function b24_cookie_header()
{
	$parts = array();
	foreach ($GLOBALS['B24_JAR'] as $name => $value) {
		$parts[] = $name . '=' . $value;
	}
	return count($parts) ? ('Cookie: ' . implode('; ', $parts)) : null;
}

function b24_capture_cookies($headerLines)
{
	foreach ($headerLines as $h) {
		if (stripos($h, 'Set-Cookie:') !== 0) {
			continue;
		}
		$p = strpos($h, ':');
		$raw = trim(substr($h, $p + 1));
		$semi = strpos($raw, ';');
		$nv = ($semi !== false) ? substr($raw, 0, $semi) : $raw;
		$eq = strpos($nv, '=');
		if ($eq === false) {
			continue;
		}
		$name = trim(substr($nv, 0, $eq));
		$value = trim(substr($nv, $eq + 1));
		if ($name !== '') {
			$GLOBALS['B24_JAR'][$name] = $value;
		}
	}
}

function b24_http_post($url, $headers, $body)
{
	$cookie = b24_cookie_header();
	if ($cookie !== null) {
		$headers[] = $cookie;
	}

	$ctx = stream_context_create(array(
		'http' => array(
			'method' => 'POST',
			'header' => implode("\r\n", array_merge($headers, array(
				'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
				'Accept: */*',
				'Accept-Language: ru,en;q=0.9',
			))),
			'content' => $body,
			'ignore_errors' => true,
			'timeout' => 90,
		),
		'ssl' => array(
			'verify_peer' => false,
			'verify_peer_name' => false,
		),
	));

	$resp = @file_get_contents($url, false, $ctx);
	$status = 200;
	if (isset($http_response_header)) {
		b24_capture_cookies($http_response_header);
		foreach ($http_response_header as $h) {
			if (stripos($h, 'HTTP/') === 0) {
				$parts = explode(' ', $h);
				$status = (int)$parts[1];
				break;
			}
		}
	}

	if ($resp === false) {
		return array('ok' => false, 'message' => 'Ошибка сетевого соединения с Bitrix24.');
	}
	if ($status < 200 || $status >= 300) {
		return array('ok' => false, 'message' => 'HTTP ' . $status . ' от Bitrix24.', 'raw' => $resp);
	}

	$json = json_decode($resp, true);
	if (!is_array($json)) {
		return array('ok' => false, 'message' => 'Некорректный ответ Bitrix24 (не JSON).', 'raw' => $resp);
	}
	return array('ok' => true, 'json' => $json, 'raw' => $resp);
}

function b24_upload_file($field, $tmpPath, $fileName, $mimeType, $size)
{
	$opts = json_encode(array(
		'formId' => B24_ID,
		'secCode' => B24_SEC,
		'fieldId' => $field,
		'fieldsSize' => array($field => $size),
	));
	$url = B24_ADDRESS . '/bitrix/services/main/ajax.php?action=crm.site.fileUploader.upload'
		. '&controller=' . B24_CONTROLLER
		. '&token=0&controllerOptions=' . rawurlencode($opts);

	$data = @file_get_contents($tmpPath);
	if ($data === false || $size === 0) {
		return array('ok' => false, 'message' => 'Не удалось прочитать файл «' . $fileName . '».');
	}
	$actualSize = strlen($data);

	$headers = array(
		'Content-Type: ' . ($mimeType !== '' ? $mimeType : 'application/octet-stream'),
		'X-Upload-Content-Name: ' . $fileName,
		'Crm-Webform-Cors: Y',
		'Content-Range: bytes 0-' . ($actualSize - 1) . '/' . $actualSize,
		'Content-Length: ' . $actualSize,
		'Connection: close',
	);

	$res = b24_http_post($url, $headers, $data);
	b24_debug('upload try field=' . $field . ' resOK=' . ($res['ok'] ? '1' : '0')
		. ' raw=' . (isset($res['raw']) ? substr($res['raw'], 0, 400) : '-'));
	if (!$res['ok'] || $res['json']['status'] !== 'success') {
		$msg = 'Ошибка загрузки файла «' . $fileName . '».';
		if (isset($res['json']['errors'][0]['message'])) {
			$msg .= ' ' . $res['json']['errors'][0]['message'];
		} elseif (isset($res['message'])) {
			$msg .= ' ' . $res['message'];
		}
		return array('ok' => false, 'message' => $msg);
	}

	return array(
		'ok' => true,
		'file' => array(
			'name' => $fileName,
			'size' => $actualSize,
			'type' => ($mimeType !== '' ? $mimeType : 'application/octet-stream'),
			'token' => $res['json']['data']['token'],
			'content' => '',
		),
	);
}

$result = array();

function b24_convert_birthdate($value)
{
	$value = trim((string)$value);
	if (preg_match('/^(\d{2})\.(\d{2})\.(\d{4})$/', $value, $m)) {
		return $m[3] . '-' . $m[2] . '-' . $m[1];
	}
	return $value;
}

/* -------- Путь 1: входящий вебхук CRM (файлы прикрепляются гарантированно) -------- */
if ($B24_WEBHOOK !== '' && strpos($B24_WEBHOOK, 'XXXX') === false) {
	try {
		$valuesRawH = isset($_POST['values']) ? $_POST['values'] : '{}';
		$valuesH = json_decode($valuesRawH, true);
		if (!is_array($valuesH)) {
			$valuesH = array();
		}

		$fields = array();
		$map = array(
			'CONTACT_LAST_NAME' => 'LAST_NAME',
			'CONTACT_NAME' => 'NAME',
			'CONTACT_SECOND_NAME' => 'SECOND_NAME',
			'COMPANY_TITLE' => 'COMPANY_TITLE',
			'CONTACT_UF_CRM_1786286779231' => 'UF_CRM_1786286779231',
			'CONTACT_UF_CRM_1773904580994' => 'UF_CRM_1773904580994',
		);
		foreach ($map as $from => $to) {
			if (isset($valuesH[$from]) && is_array($valuesH[$from]) && $valuesH[$from][0] !== '') {
				$fields[$to] = $valuesH[$from][0];
			}
		}
		if (isset($valuesH['CONTACT_BIRTHDATE']) && $valuesH['CONTACT_BIRTHDATE'][0] !== '') {
			$fields['BIRTHDATE'] = b24_convert_birthdate($valuesH['CONTACT_BIRTHDATE'][0]);
		}
		if (isset($valuesH['CONTACT_PHONE']) && $valuesH['CONTACT_PHONE'][0] !== '') {
			$fields['PHONE'] = array(array('VALUE' => $valuesH['CONTACT_PHONE'][0], 'VALUE_TYPE' => 'WORK'));
		}
		if (isset($valuesH['CONTACT_EMAIL']) && $valuesH['CONTACT_EMAIL'][0] !== '') {
			$fields['EMAIL'] = array(array('VALUE' => $valuesH['CONTACT_EMAIL'][0], 'VALUE_TYPE' => 'WORK'));
		}

		/* файловые поля: имя поля → код UF поля */
		$fileMap = array(
			'CONTACT_UF_CRM_1775469013124' => 'UF_CRM_1775469013124',
			'CONTACT_UF_CRM_1775469048165' => 'UF_CRM_1775469048165',
			'CONTACT_UF_CRM_1776162383236' => 'UF_CRM_1776162383236',
			'CONTACT_UF_CRM_1775469157830' => 'UF_CRM_1775469157830',
			'CONTACT_UF_CRM_1785924200218' => 'UF_CRM_1785924200218',
			'CONTACT_UF_CRM_1776162895926' => 'UF_CRM_1776162895926',
			'CONTACT_UF_CRM_1776162911657' => 'UF_CRM_1776162911657',
			'CONTACT_UF_CRM_1775469076443' => 'UF_CRM_1775469076443',
			'CONTACT_UF_CRM_1775468439433' => 'UF_CRM_1775468439433',
			'CONTACT_UF_CRM_1776162456548' => 'UF_CRM_1776162456548',
			'CONTACT_UF_CRM_1775469122605' => 'UF_CRM_1775469122605',
			'CONTACT_UF_CRM_1776162771956' => 'UF_CRM_1776162771956',
			'CONTACT_UF_CRM_1776162871182' => 'UF_CRM_1776162871182',
			'CONTACT_UF_CRM_1775469219074' => 'UF_CRM_1775469219074',
		);
		$shown = array();
		$fieldsPost = isset($_POST['file_field']) && is_array($_POST['file_field']) ? $_POST['file_field'] : array();
		$uploadsPost = isset($_FILES['file_upload']) ? $_FILES['file_upload'] : null;
		if ($uploadsPost && is_array($uploadsPost['error'])) {
			$filesCount = count($uploadsPost['error']);
			for ($i = 0; $i < $filesCount; $i++) {
				if ($uploadsPost['error'][$i] !== UPLOAD_ERR_OK || !isset($fieldsPost[$i]) || $fieldsPost[$i] === '') {
					continue;
				}
				$code = isset($fileMap[$fieldsPost[$i]]) ? $fileMap[$fieldsPost[$i]] : $fieldsPost[$i];
				$data = @file_get_contents($uploadsPost['tmp_name'][$i]);
				if ($data === false) {
					continue;
				}
				$b64 = base64_encode($data);
				$pair = array($uploadsPost['name'][$i], $b64);
				/* обязательные поля дублируем: что-то из них, но не пусто — фиксируем */
				$shown[$code] = $pair;
			}
		}
		foreach ($shown as $code => $pair) {
			$fields[$code] = $pair;
		}

		$payloadUrl = rtrim($B24_WEBHOOK, '/') . '/crm.contact.add';
		$body = json_encode(array('fields' => $fields), JSON_UNESCAPED_UNICODE);
		$resWh = b24_http_post($payloadUrl, array(
			'Content-Type: application/json; charset=UTF-8',
			'Content-Length: ' . strlen($body),
			'Connection: close',
		), $body);

		if ($resWh['ok'] && isset($resWh['json']['result']) && (int)$resWh['json']['result'] > 0) {
			$result = array(
				'result' => array(
					'resultId' => (int)$resWh['json']['result'],
					'message' => SUCCESS_MSG,
					'gid' => '',
					'__webhook' => true,
				),
			);
		} else {
			$msg = 'Ошибка вебхука при создании контакта.';
			if (isset($resWh['json']['error_description'])) {
				$msg .= ' ' . $resWh['json']['error_description'];
			} elseif (isset($resWh['json']['error'])) {
				$msg .= ' ' . json_encode($resWh['json']['error'], JSON_UNESCAPED_UNICODE);
			} elseif (isset($resWh['message'])) {
				$msg .= ' ' . $resWh['message'];
			}
			$result = array('status' => 'error', 'errors' => array(array('message' => $msg)));
		}
	} catch (Exception $e) {
		$result = array('status' => 'error', 'errors' => array(array('message' => 'Ошибка вебхука: ' . $e->getMessage())));
	}
	echo json_encode($result, JSON_UNESCAPED_UNICODE);
	exit;
}

try {
	$valuesRaw = isset($_POST['values']) ? $_POST['values'] : '{}';
	b24_debug('req: post=' . json_encode(array_keys($_POST), JSON_UNESCAPED_UNICODE)
		. ' files=' . json_encode(isset($_FILES['file_upload']) ? $_FILES['file_upload']['name'] : null, JSON_UNESCAPED_UNICODE)
		. ' valuesLen=' . strlen($valuesRaw));
	$values = json_decode($valuesRaw, true);
	if (!is_array($values)) {
		$values = array();
	}

	/* файлы, пришедшие из браузера: поля file_field[] + файлы file_upload[] */
	$fields = isset($_POST['file_field']) ? $_POST['file_field'] : (isset($_POST['file_field[]']) ? $_POST['file_field[]'] : null);
	$uploads = null;
	if (isset($_FILES['file_upload'])) {
		$uploads = $_FILES['file_upload'];
	} elseif (isset($_FILES['file_upload[]'])) {
		$uploads = $_FILES['file_upload[]'];
	}
	if ($fields !== null && !is_array($fields)) {
		$fields = array($fields);
	}

	if ($uploads) {
		if (!is_array($uploads['error'])) {
			$uploads = array(
				'name' => array($uploads['name']),
				'tmp_name' => array($uploads['tmp_name']),
				'type' => array($uploads['type']),
				'error' => array($uploads['error']),
				'size' => array($uploads['size']),
			);
		}
		$count = count($uploads['error']);
		for ($i = 0; $i < $count; $i++) {
			if ($uploads['error'][$i] !== UPLOAD_ERR_OK) {
				/* пустой необязательный input или ошибка */
				continue;
			}
			if (!isset($fields[$i]) || $fields[$i] === '') {
				continue;
			}
			$res = b24_upload_file(
				$fields[$i],
				$uploads['tmp_name'][$i],
				$uploads['name'][$i],
				$uploads['type'][$i],
				$uploads['size'][$i]
			);
			if (!$res['ok']) {
				$result = array('status' => 'error', 'errors' => array(array('message' => $res['message'])));
				echo json_encode($result, JSON_UNESCAPED_UNICODE);
				exit;
			}
			$values[$fields[$i]] = array($res['file']);
			b24_debug('uploaded field=' . $fields[$i] . ' name=' . $uploads['name'][$i]
				. ' size=' . $uploads['size'][$i] . ' token=' . $res['file']['token']);
		}
	}

	b24_debug('fill start values=' . json_encode(array_map(function ($v) {
		if (isset($v[0]) && is_array($v[0]) && isset($v[0]['token'])) {
			return array('file' => array('name' => $v[0]['name'], 'token' => $v[0]['token']));
		}
		return $v;
	}, $values), JSON_UNESCAPED_UNICODE));

	$post = array(
		'id' => isset($_POST['id']) ? $_POST['id'] : B24_ID,
		'sec' => isset($_POST['sec']) ? $_POST['sec'] : B24_SEC,
		'lang' => isset($_POST['lang']) ? $_POST['lang'] : 'ru',
		'trace' => isset($_POST['trace']) ? $_POST['trace'] : '',
		'entities' => isset($_POST['entities']) ? $_POST['entities'] : '[]',
		'security_sign' => isset($_POST['security_sign']) ? $_POST['security_sign'] : '',
		'properties' => isset($_POST['properties']) ? $_POST['properties'] : '{}',
		'consents' => isset($_POST['consents']) ? $_POST['consents'] : '{}',
		'recaptcha' => isset($_POST['recaptcha']) ? $_POST['recaptcha'] : '',
		'yandexSmartCaptcha' => isset($_POST['yandexSmartCaptcha']) ? $_POST['yandexSmartCaptcha'] : '',
		'timeZoneOffset' => isset($_POST['timeZoneOffset']) ? $_POST['timeZoneOffset'] : 0,
		'values' => json_encode($values, JSON_UNESCAPED_UNICODE),
	);

	$url = B24_ADDRESS . '/bitrix/services/main/ajax.php?action=crm.site.form.fill';
	$headers = array(
		'Content-Type: application/x-www-form-urlencoded; charset=UTF-8',
		'Content-Length: ' . strlen(http_build_query($post, '', '&')),
		'Connection: close',
	);

	$res = b24_http_post($url, $headers, http_build_query($post, '', '&'));
	if (!$res['ok'] || !isset($res['json']['result'])) {
		$msg = isset($res['message']) ? $res['message'] : 'Ошибка отправки заявления.';
		if (isset($res['json']['error'])) {
			$msg .= ' ' . (isset($res['json']['error_description']) ? $res['json']['error_description'] : json_encode($res['json']['error']));
		}
		$result = array('status' => 'error', 'errors' => array(array('message' => $msg)));
	} else {
		$result = $res['json'];
		b24_debug('fill ok resultId=' . (isset($res['json']['result']['resultId']) ? $res['json']['result']['resultId'] : '?')
			. ' gid=' . (isset($res['json']['result']['gid']) ? $res['json']['result']['gid'] : ''));
	}
} catch (Exception $e) {
	$result = array('status' => 'error', 'errors' => array(array('message' => 'Внутренняя ошибка прокси: ' . $e->getMessage())));
}

echo json_encode($result, JSON_UNESCAPED_UNICODE);