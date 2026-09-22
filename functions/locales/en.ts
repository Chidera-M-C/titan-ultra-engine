export default {
  // Language selection
  choose_language: `Please choose your language:`,

  // /start
  welcome: `👋 Hey <b>{{name}}</b>!\n\nSend me a photo with a short instruction.\n\nI’ll ask if you want an <b>Image</b> or a <b>Video</b>.\n\n🖼 Image = {{img}} ⭐\n🎬 Video = {{vid}} ⭐\n\nYou’ve got <b>{{free}} free stars</b>.`,

  // /credits
  credits: `⭐ You have <b>{{stars}} stars</b> left.\n\nUse /buy to top up.`,

  // /buy
  pick_package: `Pick a package:`,

  // Photo without caption
  need_caption: `Please add a short instruction as the caption of your photo.\n\nExample: "make her pose in style" or "change clothes"`,

  // Choice
  how_do_you_want: `How do you want it?`,
  image_btn: `🖼 Image — {{cost}} ⭐`,
  video_btn: `🎬 Video — {{cost}} ⭐`,

  // Not enough stars
  not_enough: `⚠️ Not enough stars.\n\nYou need:\n• {{img}} ⭐ for an Image\n• {{vid}} ⭐ for a Video\n\nYou currently have <b>{{balance}} ⭐</b>.\n\nUse /buy to top up.`,

  // No pending
  no_pending: `No pending photo found. Please send a new photo.`,

  // Generating
  generating_image: `🖼 Editing your photo... this usually takes 20–30 seconds.`,
  generating_video: `🎬 Generating your video... this usually takes 60–90 seconds.`,

  // Errors
  error_generic: `❌ Something went wrong. Please try again.`,
  error_job: `❌ Something went wrong starting the job. You haven't been charged — please try again.`,

  // Payment success
  payment_success: `✅ <b>Payment confirmed!</b>\n\n📦 {{package}}\n⭐ +{{stars}} stars`,
  payment_bonus: `\n🎁 {{bonus}}`,
  payment_balance: `\n💳 New balance: <b>{{balance}} stars</b>\n\nSend a photo with an instruction to continue.`,

  // Invoice
  invoice_description: `Top up your stars for images & videos.`,
};
