<div class="card settings-section">
  <div class="section-header">
    <h3>تنظیمات پنل</h3>
  </div>
  <div class="form grid two-column-fields">
    <label class="field">
      <span>نام پنل</span>
      <input id="dev-panel-name" type="text" value="نام پنل" />
    </label>
    <label class="field icon-field">
      <span>آیکن سایت</span>
      <div class="photo-uploader" data-photo-uploader="site-icon">
        <div class="photo-uploader-preview" data-photo-preview aria-live="polite">
          <span class="photo-uploader-placeholder" data-photo-placeholder>بدون تصویر</span>
          <img class="hidden" data-photo-image alt="آیکن سایت" />
        </div>
        <div class="photo-uploader-actions">
          <button type="button" class="btn ghost" data-photo-upload>بارگذاری</button>
          <button type="button" class="btn" data-photo-clear>حذف</button>
        </div>
        <input data-photo-input type="file" accept="image/*" class="hidden" />
      </div>
    </label>
  </div>
  <div class="section-footer">
    <button type="button" class="btn primary" id="save-panel-settings">ذخیره تنظیمات پنل</button>
  </div>
  <p class="hint">در این بخش می‌توانید عنوان پنل اورجینال و آیکن کوچک سایت را برای نمایش در نوار کناری و سربرگ مرورگر تنظیم کنید.</p>
</div>

<div class="card settings-section">
  <div class="section-header">
    <h3>تنظیمات عمومی</h3>
  </div>
  <div class="form grid">
    <label class="field">
      <span>منطقه زمانی</span>
      <select id="timezone-select"></select>
    </label>
  </div>
  <div class="section-footer">
    <button type="button" class="btn primary" id="save-general-settings">ذخیره تنظیمات عمومی</button>
  </div>
  <p class="hint">تنظیم منطقه زمانی بر اساس ساعات محلی شما باعث نمایش صحیح زمان در داشبورد و گزارش‌ها می‌شود.</p>
</div>
